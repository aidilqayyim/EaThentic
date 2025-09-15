const scraperObject = {
	url: 'https://www.google.com/search?sca_esv=6b419d715691fe69&sxsrf=AE3TifNkZDPGkJXYKRDgNVwuX9sV_2zpeA:1757951259517&q=pks+maju+restaurant&si=AMgyJEtREmoPL4P1I5IDCfuA8gybfVI2d5Uj7QMwYCZHKDZ-E0_I6HLdGKpBO8ia7os_3ka4BRG-n29-ivu-uTHMaX86TH6GVqSG4Pp81F8pT9hnzNixScPOc6iHDYk_4255OJbwhH923e2WH2B6o6sHhu2dQTsGvw%3D%3D&sa=X&ved=2ahUKEwiToezijtuPAxV0ZvUHHV6KOGoQrrQLegQIIBAA&biw=1536&bih=695&dpr=1.25',
	async scraper(browser){
		let page = await browser.newPage();
		console.log(`Navigating to ${this.url}...`);
		await page.goto(this.url);
		// Wait for the review container to be rendered
		await page.waitForSelector('div.bwb7ce');

		// Click all 'More' links to expand full review text
		const moreLinks = await page.$$('div.bwb7ce .OA1nbd a.MtCSLb');
		for (const link of moreLinks) {
			try {
				await link.click();
				await page.waitForTimeout(300); // Wait for text to expand
			} catch (e) {
				// Ignore errors if link is not clickable
			}
		}

		// Scrape review texts from the specified hierarchy
		let reviews = await page.$$eval('div.bwb7ce > div > div.OA1nbd', nodes => 
			nodes.map(n => n.textContent.trim())
		);
		console.log(reviews);
	}
}

module.exports = scraperObject;