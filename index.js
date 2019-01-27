const express = require('express');
const app     = express();
const Event   = require('events');
const uuid4   = require('uuid/v4');
const uuid5   = require('uuid/v5');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static('./public/'));

global.chats       = [ ];
global.connections = new Event();

app.post('/', (req, res) =>
{
    // c = content
    if(!req.body.c || req.body.c.constructor !== String || req.body.c.length)
        return res.status(400).send();

    chats.push
    (
        [
            req.body.c,
            uuid5
            (
                (req.headers['x-forwarded-for'] || req.connection.remoteAddress) +
                req.headers['user-agent'] +
                process.env.secret,
                new Date().toLocaleDateString()
            )
        ]
    );

    return res.send();
});

app.get('/', (req, res) =>
{
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');

    {
        let evt_listener = (content, by) => res.write
        (
            `data: ${JSON.stringify
            ({
                c : content,
                b : by,
                u : global.connections.eventNames().length
            })}\n\n`
        );

        let uid = uuid4();

        global.connections.on(uid, evt_listener);
        res.on('close', () => global.connections.removeListener(uid, evt_listener));
    }
});

let chats_copy;
let chat_router = setInterval(() =>
{
    chats_copy = global.chats;
    global.chats = [ ];

    if(!chats_copy.length) global.connections.eventNames().forEach((user) =>
    {
        global.connections.emit(user, null, null);
    });
    else chats_copy.forEach((entry) =>
    {
        global.connections.eventNames().forEach((user) =>
        {
            global.connections.emit(user, entry[0], entry[1]);
        });
    });

}, 2000);

let server = app.listen(process.env.PORT || '9003')
.on('listening', () => console.info(server.address()));