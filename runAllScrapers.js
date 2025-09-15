const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
    const dir = __dirname;
    const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.js') && f !== 'runAllScrapers.js');

    const browser = await puppeteer.launch();
    for (const file of files) {
        const scraperObj = require(path.join(dir, file));
        if (scraperObj.scraper) {
            console.log(`Running scraper in ${file}`);
            await scraperObj.scraper(browser);
        }
    }
    await browser.close();
})();
