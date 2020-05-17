"use strict";

const express = require('express'),
      log4js = require('log4js'),
      bent = require('bent'),
      fs = require('fs').promises;


async function main() {
    let app = express();
    // Configure logging
    log4js.configure({
        appenders: {console: {type: 'console'}},
        categories: {default: {appenders: ['console'], level: 'debug'}}
    });
    const logger = log4js.getLogger('app');
    app.use(log4js.connectLogger(log4js.getLogger('express'), {level: 'info'}));

    // Lookup Supervisor config
    logger.debug(`Attempting to query Supervisor configuration...`);
    const suconfig = await bent({'Authorization': `Bearer: ${process.env.SUPERVISOR_TOKEN}`}, 'json')('http://supervisor/addons/self/info');

    // Lookup Add-on config
    logger.debug(`Attempting to read local configuration from options.json`);
    const aoconfig = JSON.parse(await fs.readFile('/data/options.json', 'utf8'));

    // Configure web application
    app.use('/', async (req, res) => {
        const read_state = await bent({'Authorization': `Bearer: ${process.env.SUPERVISOR_TOKEN}`}, 'json')(`http://supervisor/core/api/states/${aoconfig.read_sensor}`);
        const write_state = await bent({'Authorization': `Bearer: ${process.env.SUPERVISOR_TOKEN}`}, 'json')(`http://supervisor/core/api/states/${aoconfig.write_sensor}`);
        res.send(`Input state: ${read_state.state}\nOutput state: ${write_state.state}`);
    });
    if (suconfig.data.ingress === true) {
        app.listen(suconfig.data.ingress_port);
        logger.debug(`Web interface is listening on port ${suconfig.data.ingress_port}`);
    }
    
    // Configure service
    setInterval(async function() {
        const state = await bent({'Authorization': `Bearer: ${process.env.SUPERVISOR_TOKEN}`}, 'json')(`http://supervisor/core/api/states/${aoconfig.read_sensor}`);
        let new_state = Object.assign({}, state);
        new_state.state = state.state.split('').reverse().join('');
        await bent('POST', {'Authorization': `Bearer: ${process.env.SUPERVISOR_TOKEN}`}, 'json', 200, 201)(`http://supervisor/core/api/states/${aoconfig.write_sensor}`, new_state);
        logger.debug(`Wrote data: ${state.state} --> ${new_state.state}`);
    }, aoconfig.poll_interval * 1000);
    logger.info(`Polling every ${aoconfig.poll_interval} seconds.`);  
}

main();