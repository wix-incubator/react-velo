import puppeteer, { EvaluateFn } from 'puppeteer';
import { getPageAtUrl } from './browser-utils';

const getTextNodesWithTexFactory = (text: string): [EvaluateFn, string] => [(text: string) => {
        const result = document.evaluate(`//*[contains(text(),'${text}')]`, document, null, XPathResult.ANY_TYPE, null);
        let node;
        let textContents = [];
        do {
            node = result.iterateNext() as Element | null;
            if (node && node.tagName.toLowerCase() !== 'script') {
                textContents.push(node.textContent);
            }
        } while(node);
        
        return textContents;
}, text];

describe('todo list repeater', () => {
    let browser: puppeteer.Browser;
    beforeAll(async () => {
        browser = await puppeteer.launch({
            //devtools: true,
            //slowMo: 100,
        });
    }, 30000);

    it('should create 3 task items', async () => {
        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/todo-list');
        const [addTasks] = await page.$x(`//*[text()='Add Task']`); // document.evaluate(`//*[text()='Add Task']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        
        await addTasks.click();
        await addTasks.click();
        await addTasks.click();

        await page.waitForFunction(() => document.evaluate(`count(//*[not(self::script) and contains(text(), 'Task')])`, document, null, XPathResult.NUMBER_TYPE, null).numberValue >= 4);

        const nodesTextContents = await page.evaluate(...getTextNodesWithTexFactory('Task'));

        expect(nodesTextContents).toEqual(expect.arrayContaining(['Task 1', 'Task 2', 'Task 3']));
    }, 60000);

    it('should delete correct task item', async () => {
        const page = await getPageAtUrl(browser, 'https://yurym4.wixsite.com/react-velo-e2e/todo-list');
        const [addTasks] = await page.$x(`//*[text()='Add Task']`); // document.evaluate(`//*[text()='Add Task']`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        
        await addTasks.click();
        await addTasks.click();
        await addTasks.click();

        await page.waitForFunction(() => document.evaluate(`count(//*[not(self::script) and contains(text(), 'Task')])`, document, null, XPathResult.NUMBER_TYPE, null).numberValue >= 4);

        const deleteButtons = await page.$$('button[aria-label=Trash]');
        await deleteButtons[1].click();
        await page.waitForFunction(() => document.evaluate(`count(//*[not(self::script) and contains(text(), 'Task')])`, document, null, XPathResult.NUMBER_TYPE, null).numberValue < 4);

        const nodesTextContents = await page.evaluate(...getTextNodesWithTexFactory('Task'));

        expect(nodesTextContents).toEqual(expect.arrayContaining(['Task 1', 'Task 3']));
        expect(nodesTextContents).toEqual(expect.not.arrayContaining(['Task 2']));
    }, 60000);

    afterAll(async () => {
        await browser.close();
    });
})