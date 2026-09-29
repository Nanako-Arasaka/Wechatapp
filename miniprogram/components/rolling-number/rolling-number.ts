Component({
  properties: { value: { type: String, value: "" } },
  data: { digits: [] },
  observers: {
    value(value: string) {
      const previous = this._previous || "";
      if (previous === value && this.data.digits.length) return;
      this._version = (this._version || 0) + 1;
      const backwards = value < previous;
      this.setData({
        digits: String(value)
          .split("")
          .map((character, index) => {
            const old = previous[index];
            const rolling =
              !!old &&
              /\d/.test(old) &&
              /\d/.test(character) &&
              old !== character &&
              previous.length === value.length;
            return {
              key: `${this._version}-${index}`,
              character,
              old,
              rolling,
              backwards,
            };
          }),
      });
      this._previous = String(value);
    },
  },
});
