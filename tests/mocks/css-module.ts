const styles = new Proxy<Record<string, string>>(
  {},
  {
    get(_target, property) {
      return typeof property === "string" ? property : "";
    },
  },
);

export default styles;
