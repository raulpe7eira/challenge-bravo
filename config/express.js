const express = require('express');
const consign = require('consign');
const bodyParser = require('body-parser');
const expressValidator = require('express-validator');
const morgan = require('morgan');
const logger = require('../server/services/logger');

module.exports = () => {
    const app = express();

    app.use(morgan('common', { stream: { write: message => logger.info(message) } }));
    app.set('view engine', 'ejs');
    app.set('views', 'client/views');
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(expressValidator());

    consign()
        .include('server/controllers')
        .then('server/predicates')
        .then('server/services')
        .into(app);

    app.use(function (req, res, next) {
        res.status(422).render('error');
        next();
    });

    return app;
};
