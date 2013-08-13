(function( app ) {

	var ui = app.ns("ui");
	var es = window.es;
	var acx = window.acx;

	app.App = ui.AbstractWidget.extend({
		defaults: {
			base_uri: localStorage["base_uri"] || "http://localhost:9200/"   // the default ElasticSearch host
		},
		init: function(parent) {
			this._super();
			this.base_uri = this.config.base_uri;
			if( this.base_uri.charAt( this.base_uri.length - 1 ) !== "/" ) {
				// XHR request fails if the URL is not ending with a "/"
				this.base_uri += "/";
			}
			if( this.config.auth_user ) {
				var credentials = window.btoa( this.config.auth_user + ":" + this.config.auth_password );
				$.ajaxSetup({
					headers: {
						"Authorization": "Basic " + credentials
					}
				});
			}
			this.cluster = new app.services.Cluster({ base_uri: this.base_uri });
			this.el = $(this._main_template());
			this.attach( parent );
			this.instances = {};
			this.quicks = {};
		},

		quick: function(title, path) {
			this.quicks[path] && this.quicks[path].remove();
			this.cluster.get(path, function(data) {
				this.quicks[path] = new ui.JsonPanel({ title: title, json: data });
			}.bind(this));
		},
		
		show: function(type, config, jEv) {
			if(! this.instances[type]) {
				var page = this.instances[type] = new ( ui[type] || es.ui[type] )(config);
				this.el.find("#"+this.id("body")).append( page );
			}
			$(jEv.target).closest("DIV.es-header-menu-item").addClass("active").siblings().removeClass("active");
			for(var p in this.instances) {
				this.instances[p][ p === type ? "show" : "hide" ]();
			}
		},

		showNew: function(type, config, jEv, tab_text) {
			var that = this,
				type_name = '',
				type_index = 0,
				page, $tab;

			// Loop through until we find an unused type name
			while (type_name === '') {
				type_index++;
				if (!this.instances[type + type_index.toString()]) {
					// Found an available type name, so put it together and add it to the UI
					type_name = type + type_index.toString();
					page = this.instances[type_name] = new es.ui[type](config);
					this.el.find("#"+this.id("body")).append( page );
				}
			}

			// Make sure we have text for the tab
			if (tab_text) {
				tab_text += ' ' + type_index.toString();
			} else {
				tab_text = type_name;
			}

			// Add the tab and its click handlers
			$tab = this.newTab(tab_text, {
				click: function (jEv) {
					that.show(type_name, config, jEv);
				},
				close_click: function (jEv) {
					$tab.remove();
					$(page).remove();
					delete that.instances[type_name];
				}
			});
			
			// Click the new tab to make it show
			$tab.trigger('click');
		},

		_openAnyRequest_handler: function(jEv) { this.show("AnyRequest", { cluster: this.cluster }, jEv); },
		_openNewAnyRequest_handler: function(jEv) { this.showNew("AnyRequest", { cluster: this.cluster }, jEv, i18n.text("Nav.AnyRequest")); return false; },
		_openStructuredQuery_handler: function(jEv) { this.show("StructuredQuery", { cluster: this.cluster, base_uri: this.base_uri }, jEv); },
		_openNewStructuredQuery_handler: function(jEv) { this.showNew("StructuredQuery", { cluster: this.cluster, base_uri: this.base_uri }, jEv, i18n.text("Nav.StructuredQuery")); return false; },
		_openBrowser_handler: function(jEv) { this.show("Browser", { cluster: this.cluster }, jEv);  },
		_openClusterHealth_handler: function(jEv) { this.quick( i18n.text("Nav.ClusterHealth"), "_cluster/health" ); },
		_openClusterState_handler: function(jEv) { this.quick( i18n.text("Nav.ClusterState"), "_cluster/state" ); },
		_openClusterNodes_handler: function(jEv) { this.quick( i18n.text("Nav.ClusterNodes"), "_cluster/nodes" ); },
		_openClusterNodesStats_handler: function(jEv) { this.quick( i18n.text("Nav.NodeStats"), "_cluster/nodes/stats" ); },
		_openStatus_handler: function(jEv) { this.quick( i18n.text("Nav.Status"), "_status" ); },
		_openInfo_handler: function(jEv) { this.quick( i18n.text("Nav.Info"), "" ); },
		_openClusterOverview_handler: function(jEv) { this.show("ClusterOverview", { cluster: this.cluster }, jEv); },

		_main_template: function() {
			return { tag: "DIV", cls: "es", children: [
//				new ui.Header({}),
				{ tag: "DIV", id: this.id("header"), cls: "es-header", children: [
					{ tag: "DIV", cls: "es-header-top", children: [
						new ui.ClusterConnect({ base_uri: this.base_uri, onStatus: this._status_handler, onReconnect: this._reconnect_handler }),
						{ tag: "H1", text: i18n.text("General.ElasticSearch") }
					]},
					{ tag: "DIV", cls: "es-header-menu", children: [
						{ tag: "DIV", cls: "es-header-menu-item pull-left", text: i18n.text("Nav.Overview"), onclick: this._openClusterOverview_handler },
						{ tag: "DIV", cls: "es-header-menu-item pull-left", text: i18n.text("Nav.Browser"), onclick: this._openBrowser_handler },
						{ tag: "DIV", cls: "es-header-menu-item pull-left", text: i18n.text("Nav.StructuredQuery"), onclick: this._openStructuredQuery_handler, children: [
							{ tag: "A", text: ' [+]', onclick: this._openNewStructuredQuery_handler}
						] },
						{ tag: "DIV", cls: "es-header-menu-item pull-left", text: i18n.text("Nav.AnyRequest"), onclick: this._openAnyRequest_handler, children: [
							{ tag: "A", text: ' [+]', onclick: this._openNewAnyRequest_handler}
						] },
						{ tag: "DIV", cls: "es-header-menu-item pull-right", text: i18n.text("Nav.ClusterHealth"), onclick: this._openClusterHealth_handler },
						{ tag: "DIV", cls: "es-header-menu-item pull-right", text: i18n.text("Nav.ClusterState"), onclick: this._openClusterState_handler },
						{ tag: "DIV", cls: "es-header-menu-item pull-right", text: i18n.text("Nav.ClusterNodes"), onclick: this._openClusterNodes_handler },
						{ tag: "DIV", cls: "es-header-menu-item pull-right", text: i18n.text("Nav.NodeStats"), onclick: this._openClusterNodesStats_handler },
						{ tag: "DIV", cls: "es-header-menu-item pull-right", text: i18n.text("Nav.Status"), onclick: this._openStatus_handler },
						{ tag: "DIV", cls: "es-header-menu-item pull-right", text: i18n.text("Nav.Info"), onclick: this._openInfo_handler }
					]}
				]},
				{ tag: "DIV", id: this.id("body"), cls: "es-body" }
			]};
		},

		newTab: function(text, events) {
			var $el = $({tag: 'DIV', cls: 'es-header-menu-item pull-left', text: text, children: [
				{tag: 'A', text: ' [-]'}
			]});

			// Apply the events to the tab as given
			$.each(events || {}, function (event_name, fn) {
				if (event_name === 'close_click') {
					$('a',$el).bind('click', fn);
				} else {
					$el.bind(event_name, fn);
				}
			});

			$('.es-header-menu').append($el);
			return $el;
		},
		
		_status_handler: function(status) {
			this.el.find(".es-header-menu-item:first").click();
		},
		_reconnect_handler: function() {
			localStorage["base_uri"] = this.base_uri;
		}

	});

})( this.app );
