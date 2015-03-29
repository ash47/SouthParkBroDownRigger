var http = require('http');

// Voting info
var hostName = 'southpark.cc.com';
var postPath = '/feeds/blog/vote';
var postData = {
    action: 'polls',
    view: 'process',
    poll_id: '51',
    poll_51: '102',
    poll_51_nonce: 'ce0ecfe4de'
};

// Max number of threads to use to vote
var hardCap = 250;     // Cap of threads
var maxThreads = 1;   // Starting number of threads

// Converts KV pairs into a URL encoded form data
function formFormat(data) {
    var k, v;

    return ((function() {
        var _results;

        _results = [];
        for (k in data) {
            v = data[k];
            _results.push("" + k + "=" + encodeURIComponent(v));
        }

        return _results;
    })()).join('&');
};

var activeThreads = 0;
function doPost(host, path, data, callback) {
    var options = {
        method: 'POST',
        host: host,
        port: 80,
        path: path,
        headers: {
            'User-Agent': 'Southpark vote spammer'
        },
        agent:false
    };

    // Grab form data
    var formData;
    if (data) {
        formData = formFormat(data);
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = formData.length;
        //options.headers['Connection'] = 'Keep-Alive';
    }

    // Create the request
    var req = http.request(options, callback);

    // Handle disconnect error
    req.on('error', function(error) {
        console.log('HTTP error occurred: ' + error.message + ' (' + activeThreads + '/' + maxThreads + ')');
        onVoteError();
    });

    // Submit form data
    if (formData) {
        req.write(formData);
    }

    return req.end();
}

function onVoteError() {
    // This thread is no longer active
    activeThreads--;

    // Adjust max threads down
    maxThreads = maxThreads/2;
    if(maxThreads < 1) maxThreads = 1;

    // Queue another vote
    spamVotes();
}

function getAllData(res, callback) {
    var buffer;

    buffer = [];
    res.on('data', function(chunk) {
        return buffer.push(chunk);
    });

    res.on('end', function() {
        callback(buffer.join(''));
    });
};

var totalVotes = 0;
function spamVotes() {
    if(activeThreads >= maxThreads) return;

    activeThreads++;

    doPost(hostName, postPath, postData, function(res) {
        if(res.statusCode == 200) {
            console.log('Vote added! (' + (++totalVotes) + ' votes so far) (' + activeThreads + '/' + maxThreads + ')');
        } else {
            console.log('Vote failed!');
            onVoteError();
            return;
        }

        getAllData(res, function(data) {
            // This thread is no longer active
            activeThreads--;

            // This was a success, increase max threads
            maxThreads += 1/maxThreads;
            if(maxThreads > hardCap) maxThreads = hardCap;

            // Add another vote
            spamVotes();
            spamVotes();
        });
    });
}

// Begin spamming votes
spamVotes();
