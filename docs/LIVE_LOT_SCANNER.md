# Live Lot Scanner — Multi-View Rolling Mode

## What changed

The scanner no longer treats one stable frame as the product. A product is now captured as a short rolling sequence while it moves through the camera lane.

Default behaviour:

1. Wait for the lane to be clear.
2. Detect a product entering the lane from local frame motion.
3. Start a rolling capture session.
4. Sample the package every ~160 ms.
5. Accept high-quality views only when motion and sharpness are within safe ranges.
6. Keep collecting until 5 useful views are captured, the 2.2 second rolling window expires, or the product leaves the lane.
7. Require at least 3 views before sending the product for inspection.
8. Upload all accepted images as one `files` multipart field set.
9. Run one inspection analysis over the complete image set.
10. Show the result, then let the inspector press **Next Product**.

## Why this fixes the original problem

A single-frame scanner can capture only the face that happens to be visible at the trigger moment. Multi-view rolling mode captures different moments/surfaces during the roll and sends them together for one inspection.

The repository's existing upload endpoint already accepts multiple package images and stores/preprocesses them concurrently. The existing inspection pipeline also runs OCR concurrently across all preprocessed images and combines their text into one inspection input.

## Important implementation detail

The camera stays open for the whole lot. Only the inspection state changes between products.

No repeated camera permission prompt is needed for each package.

## Speed controls

Tune these constants in `frontend/src/app/inspections/live/page.tsx`:

- `ROLLING_SAMPLE_MS`: how often local frames are inspected.
- `FRAME_GAP_MS`: minimum time between accepted evidence frames.
- `ROLLING_WINDOW_MS`: maximum rolling capture duration.
- `TARGET_VIEWS`: target number of evidence views.
- `MIN_VIEWS`: minimum evidence views required to submit.
- `MIN_SHARPNESS`: reject blurry frames locally.
- `PRESENCE_THRESHOLD`: detect product entering the lane.

A good hackathon starting point is 4–5 views over roughly 1.5–2.2 seconds. For very fast conveyor-style movement, lower `FRAME_GAP_MS` and `ROLLING_WINDOW_MS` carefully and test with the actual camera.

## Barcode behaviour

Barcode detection continues to run in parallel and is attached to the multi-view inspection request when available. It is not used as a sole legal-compliance shortcut in rolling mode. This is intentional: the complete visual sequence is still evaluated for each product.

## Backend compatibility

No backend route replacement is required for this feature. The current `/api/scans/upload` route accepts multiple uploaded package images, and the inspection pipeline processes all preprocessed images together.
