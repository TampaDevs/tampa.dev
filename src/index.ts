export default {
	async fetch(request, env) {
  
	  if (request.method == "OPTIONS") {
		  var res = new Response(JSON.stringify({ message: 'Successfully added contact.' }), { status: 200 });
	    res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
      return res;
    }

    if (request.method == "GET") {
		  res = new Response(await env.kv.get("event_data"), { status: 200 });
      res.headers.set("Content-Type", "application/json");
      return res;
    }
  }
}
