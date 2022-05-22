import puppeteer, { EvaluateFn } from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

describe('isHidden virtual react velo prop', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            //devtools: true,
            //slowMo: 100,
        });
    }, 30000);

    it('should show elements initially and hide after click', async () => {
        const getPageElements = () => Array.from(document.querySelectorAll('#comp-l3a7sunl,#comp-l3bfxk74')).map((el) => ({
            text: (el as HTMLElement).innerText,
            visibility: window.getComputedStyle(el).getPropertyValue('visibility'),
            })
        );

        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/hide-virtual-prop');
        const toggleHideButton = await page.$('[aria-label="Toggle Hide"]');
        const pageElements = await page.evaluate(getPageElements);

        if (!toggleHideButton) {
            throw new Error(`Unable to find toggleHideButton button`);
        }
        expect(pageElements).toEqual(expect.arrayContaining([
            {"text": "", "visibility": "visible"},
            {"text": "Initially Hidden", "visibility": "visible"}
        ]));

        await toggleHideButton.click();

        await new Promise((resolve) => setTimeout(resolve, 5 * 1000));

        const pageElementsAfterClick = await page.evaluate(getPageElements);

        expect(pageElementsAfterClick).toEqual(expect.arrayContaining([
            {"text": "", "visibility": "hidden"},
            {"text": "", "visibility": "hidden"}
        ]));
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
