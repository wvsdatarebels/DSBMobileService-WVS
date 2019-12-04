var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var DSB = require('dsbapi');
var axios = require('axios');
var jsdom = require("jsdom");
var tableToJson = require('html-table-to-json');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/dsb/today/get', async function (req, res) {
    const dsb = new DSB(req.body.username, req.body.password);

    const data = await dsb.fetch();
    const timetables = DSB.findMethodInData('timetable', data);

    const today = await axios.get(timetables['data'][1]['url']);
    const today_html = new jsdom.JSDOM(today.data);
    const today_table = today_html.window.document.getElementsByClassName("mon_list")[0].innerHTML;
    const today_json = new tableToJson(`<table> ` + today_table + `</table>`);

    res.status(200).send({
        responseTime: new Date().getTime(),
        result: normalizeResponse(today_json.results[0])
    });

});

app.post('/dsb/next/get', async function (req, res) {
    const dsb = new DSB(req.body.username, req.body.password);

    const data = await dsb.fetch();
    const timetables = DSB.findMethodInData('timetable', data);

    const next = await axios.get(timetables['data'][0]['url']);
    const next_html = new jsdom.JSDOM(next.data);
    const next_table = next_html.window.document.getElementsByClassName("mon_list");
    var result = [];

    for (var i = 0; i < next_table.length; i++) {
        const json = new tableToJson(`<table> ` + next_table[i].innerHTML + `</table>`);

        result.push({
            date: json.results[0][0]['Datum'],
            data: normalizeResponse(json.results[0])
        });
    }

    res.status(200).send({
        responseTime: new Date().getTime(),
        result: result
    });

});

function normalizeResponse(resp) {
    var res = [];

    for (var i = 0; i < resp.length; i++) {
        res.push({
            date: resp[i]['Datum'],
            time: resp[i]['Stunde'],
            day: resp[i]['Tag'],
            school_class_before: resp[i]['(Klasse(n))'],
            lesson_before: resp[i]['(Fach)'],
            room_before: resp[i]['(Raum)'],
            type: resp[i]['Art'],
            representative: resp[i]['Vertreter'],
            lesson_after: resp[i]['Fach'],
            room_after: resp[i]['Raum'],
            text: resp[i]['Text'],
            cancelled: resp[i]['Entfall'] === "x"
        });
    }

    return res;
}

module.exports = app;
