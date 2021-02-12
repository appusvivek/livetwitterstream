const http = require('http');
const path = require('path');
const express = require('express');
const socketIo = require('socket.io');
const needle = require('needle');
const config = require('dotenv').config();
const TOKEN  = process.env.TWITTER_BEARER_TOKEN;
const PORT = process.env.PORT || 3000;

const app = express();

const server = http.createServer(app);
const io = socketIo(server);


app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname,'../', 'client', 'index.html'));
})

const rulesAPI = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamAPI = 'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id';

const rules = [
    {value: 'farmers has:images'},
];

async function getRules() {
    const response = await needle('get', rulesAPI, {
        headers: {
            Authorization: `Bearer ${TOKEN}`
        }
    });

    return response.body;
}

async function setRules() {

    const data = {
        add: rules
    };

    const response = await needle('post', rulesAPI, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });

    return response.body;
}

async function deleteRules(rules) {

    if(!Array.isArray(rules.data)){
        return null;
    }

    const ids = rules.data.map(rule => rule.id);
    const data = {
        delete: {
            ids: ids
        }
    };

    const response = await needle('post', rulesAPI, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`
        }
    });

    return response.body;
}

function streamInitiate(socket) {
    const stream = needle.get(streamAPI, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        }
    });

    stream.on('data', (data) => {
        try {
            const json = JSON.parse(data);
            socket.emit('tweet', json);
        } catch (error) {
            
        }
    })
}

io.on('connection', async () => {

    let currentRules;

    try {
        currentRules = await getRules();
        await deleteRules(currentRules);
        await setRules();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }

    streamInitiate(io);
})


server.listen(PORT, () => console.log(`Listening on port ${PORT}`));