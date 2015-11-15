
// These two lines are required to initialize Express in Cloud Code.
 express = require('express');
 app = express();

// Global app configuration section
app.set('views', 'cloud/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(express.bodyParser());    // Middleware for reading request body


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Simple syntax to create a new subclass of Parse.Object.
var DataPoint = Parse.Object.extend("Point");



function fetch(thing,req,res,limit){
	limit = limit || 500;

	var resultPromise = new Parse.Promise();

	var query = new Parse.Query(DataPoint);
	query.equalTo("thing", thing);
	query.descending("createdAt");
	query.limit(limit);

	query.find({
	  success: function(results) {
	  	if(results.length == 0){
	  		res.sendStatus(404);
	  		return;
	  	}
		var list = [];	 
	    for (var i = 0; i < results.length; i++) {
	      var object = results[i];
	      var data =  object.get('data') || {};
	      data.timestamp = object.get("createdAt");
	      list.push(data);
	    }
	    resultPromise.resolve(list);
	  },
	  error: function(error) {
	    res.error("error " + error)
	    resultPromise.reject(error);
	  }
	});
	return resultPromise;
}


function store(thing,json,req,res){
	// Create a new instance of that class.
	var dataPoint = new DataPoint();

	//json.timestamp = new Date().getTime();

	dataPoint.save({'data':json,'thing':thing}, {
  	success: function(dataPoint) {
    	// Execute any logic that should take place after the object is saved.
    	 	res.json( json )
    },
  	error: function(dataPoint, error) {
    	// Execute any logic that should take place if the save fails.
    	// error is a Parse.Error with an error code and message.
    	res.send(error)
   	}
});
}



app.get("/last/:thing",function(req,res){
	fetch(req.params.thing,req,res,1).then(function(results){
		res.json(results[0]);
	});
});

app.get("/csv/:thing",function(req,res){
	fetch(req.params.thing,req,res).then(function(results){
		res.type("text/plain");
		
		var first = results[0];
		var keys = Object.keys(first);
		keys.splice( keys.lastIndexOf("timestamp"),1);
		keys.unshift("timestamp");

		var out = [];
		out.push(keys.join());

		for( var i in results ){
			var result = results[i];

			var line = [];
			for( var keyi in keys ){
				var key = keys[keyi];
				var val = result[key] || '';
				if( typeof val.getMonth === 'function'){
					line.push( JSON.stringify( val ) );
				}else{
					line.push( val  );
				}
			}
			out.push(line.join());

		}
         
        res.send(out.join("\n"));
	});
});

app.get('/thingie/:thing', function(req, res) {
  res.render('thingie', {thing:req.params.thing});
});

 

app.post("/:thing",function(req,res){
	store(req.params.thing,req.body,req,res);
});

app.get('/:thing', function(req, res) {
	if( Object.keys( req.query ).length == 0 ){
		fetch(req.params.thing,req,res).then(function(results){
			res.json(results);
		});
		return;
	}

	var json = {};
	if( req.query.json ){
		json = JSON.parse(req.query.json);
	}else{
		json = {};
		for( key in req.query ){
			json[key] = parseFloat(req.query[key]) || req.query[key] ;
		}
	}

	store(req.params.thing,json,req,res);
});



 
// Attach the Express app to Cloud Code.
app.listen();
