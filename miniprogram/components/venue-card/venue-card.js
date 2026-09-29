"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const venue_image_1 = require("../../utils/venue-image");
Component({
    properties: { venue: { type: Object, value: null } },
    data: { image: "" },
    observers: {
        venue(venue) {
            this.setData({ image: (0, venue_image_1.venueImage)(venue?.coverImage) });
        },
    },
    methods: {
        open() {
            this.triggerEvent("open", { id: this.data.venue.id });
        },
        book() {
            this.triggerEvent("book", { id: this.data.venue.id });
        },
        imageFailed() {
            this.setData({ image: "/assets/ui/venue.svg" });
        },
    },
});
