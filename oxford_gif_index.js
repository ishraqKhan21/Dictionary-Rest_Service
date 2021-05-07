/*
=-=-=-=-=-=-=-=-=-=-=-=-
Dictionary and GIF Search
=-=-=-=-=-=-=-=-=-=-=-=-
Student ID:23518749
Comment (Required):
Server recieves the Ox_endpoint and api request for recieving definitions is made to Oxford API
 which then calls giphy api synchronously 
=-=-=-=-=-=-=-=-=-=-=-=-
*/
const fs = require("fs");
const http = require('http');
const https = require('https');
const url = require("url");

const credentials = require('./auth/credentials.json');
const port = 3000;
const server = http.createServer();

server.on("listening", listening_handler);
server.listen(port);
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}
server.on("request", connection_handler);
function connection_handler(req, res){
	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
	if(req.url === "/"){
		const main = fs.createReadStream('html/index.html');
		res.writeHead(200, {'Content-Type':'text/html'});
        main.pipe(res);
    }
	else if(req.url === "/book.ico"){
		const book = fs.createReadStream('images/book.ico');
		res.writeHead(200,{'Content-Type':'image/x-icon'});
		book.pipe(res);
	}
    //start of search and Oxford API
	else if(req.url.startsWith('/search')) {
		res.writeHead(200, {"Content-Type": "text/html"});
        const word = url.parse(req.url, true).query.word;
        console.log("||Begin Word Search||");
        get_word_Definition(word, res);

    }
    //error handling
	else{
		res.writeHead(404, {'Content-Type':'text/html'});
		res.end(`<h1>404 Not Found.</h1>`);
	}

}
//Oxford API
function get_word_Definition(word, res) {
    if (!word){
        throw "Word not defined!";
    }
    const ox_endpoint = `https://od-api.oxforddictionaries.com/api/v2/entries/en-gb/${word}?fields=definitions`;
    const options = {
        method:"GET", 
        headers: credentials
    };
    const word_request = https.get(ox_endpoint, options);
    word_request.once("response", oxford_stream);
    function oxford_stream (words_stream){
        let words_data = "";
        words_stream.on("data", chunk => words_data += chunk);
        words_stream.on("end", () => parse_serve_word_results(words_data, word, res));
    }
}

//serves results for inputted word from the Oxford API
function parse_serve_word_results(body, word, res){
    create_cache_for_oxwords(body);
    const words_object = JSON.parse(body);
    const coreDefinition = words_object.results[0].lexicalEntries[0].entries[0].senses[0].definitions;
    const otherDefinitions = words_object.results[0].lexicalEntries[0].entries[0].senses[0].subsenses.map(sub => sub.definitions); 
    let words = otherDefinitions;
    words.push(coreDefinition);

    //if word not found
    if(!words){
        results = "<h1>Words: No Results Found</h1>";
    }
    else{
        console.log("\n\n\DEFINITIONS  LOGGED OUTPUT\n\n");
        words.forEach(element => {
            console.log(element);
        });
        results = words.map(word => `<p>${word}</p><br>`).join('');
    }
    res.write(`<h1>Word Results:</h1><ul>${results}</ul>`);
    console.log("|Word Search Finished|");
    console.log("\n||Now Begin GIF Search||");
    gif_search_request(word,res)

}

//requesting from giphy api here
function gif_search_request(input, res) {
	const credentials2 = require('./auth/credentials2.json');
    const gif_endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${credentials2.api_key}&q=${input}&limit=20&offset=0&rating=g&lang=en`;
	const word_request = https.get(gif_endpoint);

    word_request.once("response", giphy_stream);
        //lazy and unnecessary second stream function here but too much work from
        //other classes to deal with.
        function giphy_stream (words_stream){
            let words_data = "";
            words_stream.on("data", chunk => words_data += chunk);
            words_stream.on("end", () => parse_serve_gif_results(words_data, res));  
        }
}

//Giphy JSON is parsed and GIF results given here
function parse_serve_gif_results(body,res){
    create_cache_for_gifs(body);
    const gifs_object = JSON.parse(body);
    const relatedGifsArray = gifs_object.data.map(gif => gif.url);
    let gifs = relatedGifsArray;
    //if gifs not found
    if(!gifs){
        gifRresults = "<h1>Gifs: No Results Found</h1>";
    }
    else{
        console.log(`\n\nGIFS LOGGED OUTPUT\n\n`);
        gifs.forEach(element => {
            console.log(element);
        });
        gifResults = gifs.map(gif => `<p>${gif}</p><br>`).join('');
    }
    res.write(`<h1>GIF Results:</h1><ul>${gifResults}</ul>`);
    res.end();
    console.log("|Gif Search Finished|");
}
function create_cache_for_oxwords(JSONBodyResults){
    fs.writeFileSync('./cache/user_input_oxwords.json',JSON.stringify(JSONBodyResults),(err)=>{
        if(err) throw err;
    });
}
function create_cache_for_gifs(JSONBodyResults){
    fs.writeFileSync('./cache/user_input_gifs.json',JSON.stringify(JSONBodyResults),(err)=>{
        if(err) throw err;
    });
}
