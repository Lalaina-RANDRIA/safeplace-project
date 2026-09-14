import type { ExtractionResultMessage } from '../types/extraction';

export default defineBackground(() => {
  browser.sidePanel
    .setPanelBehavior({
      openPanelOnActionClick: true,
    })
    .catch(console.error);

  browser.runtime.onMessage.addListener((message: ExtractionResultMessage) => {
    if (message.type !== 'EXTRACTION_RESULT') {
      return;
    }

    void browser.runtime.sendMessage({
      type: 'EXTRACTION_RESULT_FOR_PANEL',
      payload: message.payload,
    });
  });
});
