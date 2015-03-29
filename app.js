var http = require('http');

// Voting info
var hostName = 'southpark.cc.com';
var postPath = '/feeds/blog/vote';
var postData = [{
    action: 'polls',
    view: 'process',
    poll_id: '51',
    poll_51: '102',
    poll_51_nonce: 'ce0ecfe4de'
}, {
    action: 'polls',
    view: 'process',
    poll_id: '59',
    poll_59: '118',
    poll_59_nonce: '096e6fd69c'
}, {
    action: 'polls',
    view: 'process',
    poll_id: '54',
    poll_54: '108',
    poll_54_nonce: 'c344d72140'
}];
var postNum = 0;

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
        console.log('HTTP error occurred: ' + error.message + ' (' + activeThreads + '/' + Math.ceil(maxThreads) + ' connections)');
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

function skipAllData(res, callback) {
    res.on('data', function(){});
    res.on('end', callback);
};

var totalVotes = 0;
function spamVotes() {
    if(activeThreads >= maxThreads) return;

    activeThreads++;

    // Cycle between the posts
    var ourPostData = postData[postNum];
    if(++postNum >= postData.length) postNum = 0;

    doPost(hostName, postPath, ourPostData, function(res) {
        if(res.statusCode == 200) {
            console.log('Vote added! (' + (++totalVotes) + ' votes so far) (' + activeThreads + '/' + Math.ceil(maxThreads) + ' connections)');
        } else {
            console.log('Vote failed!');
            onVoteError();
            return;
        }

        skipAllData(res, function() {
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
