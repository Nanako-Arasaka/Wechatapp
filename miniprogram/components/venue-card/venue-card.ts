import { venueImage } from "../../utils/venue-image";
import { Venue } from "../../types";

Component({
  properties: { venue: { type: Object, value: null } },
  data: { image: "" },
  observers: {
    venue(venue: Venue | null) {
      this.setData({ image: venueImage(venue?.coverImage) });
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
