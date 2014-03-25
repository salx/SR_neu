/*
Original-Code hier: http://bl.ocks.org/mbostock/5944371
*/

(function(){
	var margin = {top: 300, right: 280, bottom: 250, left: 280},
		radius = Math.min(margin.top, margin.right, margin.bottom, margin.left) -10;

	var color = d3.scale.category10;

	var svg = d3.select("svg")
		.attr("width", 500)
		.attr("height", 500)
		.append("g")
		.attr("transform", "translate(" + (margin.left-50) + "," + (margin.top-50) + ")");

	var arc = d3.svg.arc()
		.startAngle( function(d){ return d.x; } )
		.endAngle( function(d){ return d.x + d.dx - 0.01 / ( d.depth + 0.5 ); } )
		.innerRadius( function(d){ return radius / 3 * d.depth; } )
		.outerRadius( function(d){ return radius / ( 2 + d.depth ) * ( d.depth + 1 ) -1; } )

	var dataset = [];
	var input = "geschlecht";

	d3.json( "Stiftungsrat.json", function( err, data ){
		var order= ["SPÖ", "ÖVP", "FPÖ", "BZÖ", "unabhängig", "unbekannt", "Krone"];
		order.forEach( function( partei ){
			dataset = dataset.concat( data.filter( function(d){ return d.partei === partei; } ) )
		} )
		transitionGeschlecht();
		d3.selectAll("li").on("click", change);
	} )

	function transitionGeschlecht(){
		var root = {
			name: "Stiftungsrat",
			value: 0,
			children: []
		};

		var sexes = {};

		dataset.forEach( function( person ) {
			if( !sexes[ person.sex ] ){
				sexes[ person.sex ] = {
					name: person.sex,
					value: 0,
					children: []
				}
			}
			sexes[ person.sex ].children.push( person );
			sexes[ person.sex ].value++;
			root.value++;
		} );
		root.children = d3.values( sexes );
		drawChart( root );
	}

	function transitionGremien(){
		var root = {
			name: "Stiftungsrat",
			value: 0,
			children: [] 

		};
		var gremien = {};
		dataset.forEach( function( person ){
			if( !gremien[ person.gremium ] ){
				gremien[ person.gremium ] = {
					name: person.gremium,
					value: 0,
					children: []
				}
			}
			gremien[ person.gremium ].children.push( person );
			gremien[ person.gremium ].value++;
			root.value++;
		} );
		root.children = d3.values( gremien );
		drawChart( root );
	}

	function transitionPartei(){
		var root = {
			name: "Stiftungsrat",
			value: 0,
			children: []
		};
		var parteien = {};
		dataset.forEach( function( person ){
			if( !parteien[ person.partei ] ){
				parteien[ person.partei ] = {
					name: person.partei,
					value: 0,
					children: []
				}
			}
			parteien[ person.partei ].children.push( person );
			parteien[ person.partei ].value++;
			root.value++;
		} );
		root.children = d3.values( parteien );
		drawChart( root );
	}

	function drawChart(root){
		var partition = d3.layout.partition()
			.size( [ 2 * Math.PI, radius ] );

		partition
			.value( function(d){ return d.value; } )
			.nodes( root )
			.forEach( function(d){
				d._children = d.children;
				d.sum = d.value;
				d.key = key(d);
				d.fill = fill(d);
			} );

		// Now redefine the value function to use the previously-computed sum.
 		/* partition
      		.children(function(d, depth) { return depth < 2 ? d._children : null; })
      		.value(function(d) { return d.sum; });
      	*/

		svg.selectAll( ".center" ).remove();

		//draw and re-draw the center and the center-label
		var center = svg.append("g")
			.classed('center', true )
			.on("click", zoomOut);

		var circle = center.append("circle")
			.attr("r", radius / 3);

		center.append("title")
			.text("zoom out");

		//zeichnen der Segmente
		var path = svg.selectAll("path")
			.data( partition.nodes( root ).slice(1) );//was macht slice nochmal?

		path
			.enter()
			.append("path")
			.on("click", zoomIn);

		path
			.attr("d", arc)
			.style("fill", function(d){ return d.fill; })
			.style("fill-opacity", function(d){
				if( d.depth === 2 ){
					return 0.03;// Ich will nur die inneren Kreise sehen, so: unschön gelöst...
				}else{
					return 1;
				}
			})
			.each( function(d){ this._current = updateArc(d); } );

		/*
		path - ändert nichts, ob das da ist oder nicht
			.exit()
			.remove();
		*/

		function zoomIn(p){
			if( p.depth > 1 ) p = p.parent;
			if( !p.children ){ return; }
			zoom( p, p, p.name );
		}

		function zoomOut(p){
			if( !p.parent ) return; 
			//label.text("");
			zoom( p.parent, p, p.parent.name );
		}

		function zoom( root, p, labelText ){
			if( document.documentElement.__transition__ ) return; //check for CSS transitions, if so skip

			var enterArc,
			exitArc,
			outsideAngle = d3.scale.linear().domain( [ 0, 2 * Math.PI ] );

			function insideArc(d){//bitte das shorthand erklären / Hier hat's was. wie werden die keys verglichen??
				//console.log( p.key, d.key);
				return p.key > d.key //wenn p.key größer key
					? {depth: d.depth - 1, x: 0, dx: 0} : //kann das das Problem sein?? die keys sind keine zahlen
					p.key < d.key //else if p.key kleiner...
					? {depth: d.depth - 1, x: 2 * Math.PI, dx: 0}
					: {depth: 0, x: 0, dx: 2 * Math.PI};//ansonsten
			}

			function outsideArc(d){
				return {depth: d.depth + 1, x: outsideAngle(d.x), dx: outsideAngle(d.x + d.dx) - outsideAngle(d.x)};
			}

			center.datum(root);
			
			// When zooming in, arcs enter from the outside and exit to the inside.
			// Entering outside arcs start from the old layout.
			if (root === p) enterArc = outsideArc, exitArc = insideArc, outsideAngle.range([p.x, p.x+p.dx]);

			path = path.data(partition.nodes(root).slice(1), function(d) { return d.key; });

			// When zooming out, arcs enter from the inside and exit to the outside.
			// Exiting outside arcs transition to the new layout.
			if (root !== p) enterArc = insideArc, exitArc = outsideArc, outsideAngle.range([p.x, p.x + p.dx]);

			d3.transition().duration( d3.event.altKey ? 7500:750 ).each( function(){
				//console.log(root)
				path.exit().transition()
					.style( "fill-opacity", function(d){ return d.depth === 1 + ( root === p) ? 1: 0; } ) //was gehöt da zum if-statement, was nicht?
					.attrTween( "d", function(d){ return arcTween.call( this, exitArc(d) ); } ) // wieso an exitArc was übergeben??
					.remove();
				
				path.enter().append("path")
					.style( "fill-opacity", function(d){ return d.depth === 2 - ( root === p) ? 1: 0; } )
					.style( "fill", function(d){ return d.fill; } )
					.on( "click", zoomIn )
					.each( function(d){ this._current = enterArc(d); } )

				path.transition()
					//.each( "end", function(d, i){
					// } )
					.style("fill-opacity", function(d){
						if(d.depth===2){
							return 0.03;
						}else{
							return 1;
						}
					})
					.attrTween("d", function(d) { return arcTween.call(this, updateArc(d) ); } )
			} );
		}
	}

	function key(d){//wofür brauche ich diese Funktion?
		var k = [];
		var p = d;
		while ( p.depth ) k.push(p.name), p=p.parent;//wieso p=p.parent? wird das jedes mal ausgeführt oder nur am Schluss?
		return k.reverse().join(".");
	}

	function fill(d){
		var p = d;
		var c;
		if( input === "geschlecht" ){
			if( p.depth === 1 ){
				var colors = {
					'm': "#cfb725",
					'f': "#30b68f",
				}
				return colors[p.name];
			}else if( p.depth === 2 ){
				var colors = {
					'SPÖ': 'red',
					'ÖVP': 'black',
					'FPÖ': 'blue',
					'Grüne': 'green',
					'BZÖ': 'orange',
					'unabhängig': '#999',
					'Krone': '#999'
				}
				return colors[p.partei];
			}
		}else if( input === "gremien" ){
			if( p.depth === 2 ){
				var colors = {
					'SPÖ': 'red',
					'ÖVP': 'black',
					'FPÖ': 'blue',
					'Grüne': 'green',
					'BZÖ': 'orange',
					'unabhängig': '#999',
					'Krone': '#999'
				}
				return colors[p.partei];
			}else if( p.depth === 1 ){
				var c = "#999";
				return c;
			}

		}else if( input === "partei" ){
			if(p.depth === 1){
				var colors = {
					'SPÖ': 'red',
					'ÖVP': 'black',
					'FPÖ': 'blue',
					'Grüne': 'green',
					'BZÖ': 'orange',
					'unabhängig': '#999',
					'Krone': '#999'
				}
				return colors[p.name];
			}else if(p.depth === 2){
				var c = "#999";
				return c;
			}
		}
	}

	function arcTween(b){
		//console.log(b) // erster Hinweis: kommt hier kaputt an
		var i = d3.interpolate(this._current, b);
		this._current = i(0);
		return function(t) {
			return arc(i(t));
		};
	}

	function updateArc(d){
		return{ depth: d.depth, x:d.x, dx:d.dx };
	}

	function change(){
		input = this.id;
		d3.selectAll("li.selected")
			.attr("class", "");
		d3.select(this).attr("class", "selected");
		d3.selectAll(".text")
			.classed("hidden", true);
		d3.select(".text."+this.id).classed("hidden", false);
		if(this.id === "gremien") {
			transitionGremien();
		} else if(this.id ==="partei"){
			transitionPartei();
		} else if(this.id ==="geschlecht"){
			transitionGeschlecht();
		}
	}

})();