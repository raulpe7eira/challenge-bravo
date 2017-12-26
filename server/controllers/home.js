const logger = require('../services/logger');
const currencyPredicate = require('../predicates/currency');

module.exports = app => {
    app.get('/', (req, res, next) => {
        const oxrClient = new app.server.services.OxrClient();
        oxrClient.currencies((errors, request, response, object) => {
            if (errors) {
                logger.info(`Encontrado erros ao buscar as moedas: ${errors}`);
                return res.status(422).json({ errors: errors });
            }
            const currencies = Object.keys(object).filter(key => currencyPredicate.regex.test(key));
            res.render('home', { amount: {}, from: {}, to: {}, currencies: currencies, convertion: {} });
        });
    });
}
