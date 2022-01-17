import puppeteer, { EvaluateFn } from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

const getTextNodesWithTextFactory = (text: string): [EvaluateFn, string] => [(text: string) => {
        const result = document.evaluate(`//*[contains(text(),'${text}')]`, document, null, XPathResult.ANY_TYPE, null);
        let node;
        let textContents = [];
        do {
            node = result.iterateNext() as Element | null;
            if (node && node.tagName.toLowerCase() !== 'script') {
                const visibility = window.getComputedStyle(node).getPropertyValue('visibility');
                textContents.push({
                    text: node.textContent,
                    visibility,
                });
            }
        } while(node);
        
        return textContents;
}, text];

async function clickNTimes(elemet: puppeteer.ElementHandle, n: number) {
    for (let i = 0; i < n; i++) {
        await elemet.click();
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

describe('element in container show hide', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            //devtools: true,
            //slowMo: 100,
        });
    }, 30000);

    it('should show single text', async () => {
        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/text-in-container');
        const increment = await page.$('button[aria-label=Increment]');

        if (!increment) {
            throw new Error(`Unable to find increment button`);
        }
        
        await clickNTimes(increment, 4);

        await page.waitForFunction(() => document.evaluate(`count(//*[not(self::script) and contains(text(), 'Text')])`, document, null, XPathResult.NUMBER_TYPE, null).numberValue >= 4);

        const nodesTextContents = await page.evaluate(...getTextNodesWithTextFactory('Text'));

        expect(nodesTextContents).toEqual(expect.arrayContaining([
            {"text": "Text1", "visibility": "visible"},
            {"text": "Text2", "visibility": "hidden"},
            {"text": "Text3", "visibility": "hidden"},
            {"text": "Text4", "visibility": "hidden"}
        ]));

        await clickNTimes(increment, 2);

        const nodesTextContentsAfterTwoClicks = await page.evaluate(...getTextNodesWithTextFactory('Text'));

        expect(nodesTextContentsAfterTwoClicks).toEqual(expect.arrayContaining([
            {"text": "Text1", "visibility": "hidden"},
            {"text": "Text2", "visibility": "hidden"},
            {"text": "Text3", "visibility": "visible"},
            {"text": "Text4", "visibility": "hidden"}
        ]));

    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
});
