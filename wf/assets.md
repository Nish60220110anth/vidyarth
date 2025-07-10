| Asset Type           | Usage Pattern                 | Est. Volume  | Recommended Storage   | Reason                                                               |
| -------------------- | ----------------------------- | ------------ | --------------------- | -------------------------------------------------------------------- |
| **Company Logos**    | Mostly **read**, low change   | \~800 images | **Firebase**          | Easy caching, global CDN delivery, minimal space use                 |
| **News Images**      | Many images, **mostly read**  | Many         | **Firebase**          | Firebase scales well for heavy image access; keeps server light      |
| **Overview Texts**   | Frequent **edits**, 800 files | \~800        | **Server** (DB or FS) | Small in size; benefit from low-latency local edits                  |
| **Video Thumbnails** | Mostly **read**               | Many         | **Firebase**          | Offload to CDN, improve delivery speed                               |
| **JDs (PDFs)**       | Upload + Read, \~1 per JD     | 800+ PDFs    | **Firebase**          | Keeps server clean; PDF previews work better with Firebase           |
| **Compendium Texts** | 800 files, many **edits**     | \~800        | **Server** (DB)       | Should ideally be version-controlled and fast-editable               |
| **Compendium PDFs**  | \~4000 PDFs, heavy **read**   | \~4000       | **Firebase**          | High traffic → Firebase’s CDN + file protection + cheap cold storage |
