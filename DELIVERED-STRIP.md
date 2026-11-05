# Shor plug — "Recently delivered" strip

The home screen now shows real deliveries (photos and two short suya videos), two at a time,
each with a ✓ Delivered badge, the item, "Delivered to [area]" and when.

## Install
1. Unzip into C:\Users\HP\ndu and choose Replace (adds chat\public\delivered\ with the photos and videos).
2. Push: git add -A, git commit -m "Delivered strip", git push. No SQL needed.

## Change or add deliveries
Edit the list at the top of chat\src\components\DeliveredCarousel.tsx:
  { item: "Crates of eggs", area: "Atekong", when: "yesterday", image: "/delivered/eggs.jpg", ask: "..." },
Put new photos in chat\public\delivered\. For a video, add a short .mp4 and a .jpg cover with the same name.

Note: "earlier this morning" / "yesterday" are fixed words, so refresh the list as new deliveries come in.
