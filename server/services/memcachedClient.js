var memcached = require('memcached');

function createMencachedClient() {
    return new memcached('192.168.99.100:11211', {
        retries: 10,
        retry: 10000,
        remove: true
    });
};

module.exports = () => {
    return createMencachedClient;
};
