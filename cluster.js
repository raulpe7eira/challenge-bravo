var cluster = require('cluster');
var os = require('os');

const CPUS = os.cpus();

if (cluster.isMaster) {
    CPUS.forEach(() => {
        cluster.fork()
    });
    cluster.on('exit', worker => {
        cluster.fork();
    });
} else {
    require('./index.js')
}
