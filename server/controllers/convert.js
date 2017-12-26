const { query, validationResult } = require('express-validator/check');
const currencyPredicate = require('../predicates/currency');
const logger = require('../services/logger');
const accounting = require('accounting');

const getRate = (base, rates, from, to) => {
    if (!rates[base]) throw 'Não possui taxa base';
    if (!rates[from]) throw "Não possui taxa para moeda origem";
    if (![to]) throw "Não possui taxa para moeda final";
    if (from === base) return rates[to];
    if (to === base) return 1 / rates[from];
    return rates[to] * (1 / rates[from]);
};

const formatMoney = value => {
    return accounting.formatNumber(value, 6, ".", ",");
};

const converter = (res, from, to, amount, object) => {
    const rate = getRate(object.base, object.rates, from, to);
    const result = amount * rate;

    return res.format({
        html: () => {
            res.render('home', {
                amount: amount,
                from: from,
                to: to,
                currencies: Object.keys(object.rates).filter(key => currencyPredicate.regex.test(key)),
                convertion: `Taxa: ${formatMoney(rate)} / Conversão: ${formatMoney(result)}`
            });
        },
        json: () => {
            res.status(200).json({
                request: {
                    query: `/convert?from=${from}&to=${to}&amount=${amount}`,
                    amount: amount,
                    from: from,
                    to: to
                },
                meta: {
                    timestamp: object.timestamp,
                    rate: rate
                },
                response: result
            });
        }
    });
};

module.exports = app => {

    app.get('/convert', [
        query('from', `Valor da moeda origem é obrigatório e ${currencyPredicate.message}.`).matches(currencyPredicate.regex),
        query('to', `Valor da moeda final é obrigatório e ${currencyPredicate.message}.`).matches(currencyPredicate.regex),
        query('amount', 'Valor a ser convertido é obrigatório e deve ser um decimal.').isLength({ min: 1 }).isFloat()
    ], (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.info(`Encontrado erros de validação: ${errors}`);
            return res.format({
                html: () => {
                    res.render('error', { errors: errors.mapped() });
                },
                json: () => {
                    res.status(422).json({ errors: errors.mapped() });
                }
            });
        }

        const from = req.query.from.toUpperCase();
        const to = req.query.to.toUpperCase();
        const amount = req.query.amount;

        var memcachedClient = app.server.services.memcachedClient();
        memcachedClient.get('oxr-latest', (erro, retorno) => {
            if (erro || !retorno) {
                const oxrClient = new app.server.services.OxrClient();
                oxrClient.latest((errors, request, response, object) => {
                    if (errors) {
                        logger.info(`Encontrado erros ao buscar as taxas: ${errors}`);
                        return res.format({
                            html: () => {
                                res.render('error', { errors: errors });
                            },
                            json: () => {
                                res.status(422).json({ errors: errors });
                            }
                        });
                    }
                    memcachedClient.set('oxr-latest', object, 100000, erro => console.log(erro));
                    converter(res, from, to, amount, object);
                });
            } else {
                const object = retorno;
                converter(res, from, to, amount, object);
            }
        });
    });

};
