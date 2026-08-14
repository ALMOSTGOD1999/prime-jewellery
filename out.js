(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // inertia/components/app/main.tsx
  var import_utils = __require("~/lib/utils");
  var import_alert = __require("~/components/ui/alert");
  var import_use_user = __toESM(__require("~/hooks/use-user"), 1);
  var import_user = __require("#enums/user");
  var import_jsx_runtime = __require("react/jsx-runtime");
  var Main = ({ fixed, className, children, ...props }) => {
    const user = (0, import_use_user.default)();
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "main",
      {
        className: (0, import_utils.cn)(
          "flex-1 overflow-y-auto p-4 md:p-6",
          "scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent",
          className
        ),
        ...props,
        children: [
          !user.activatedAt && user.role === import_user.UserRoleEnum.USER && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            import_alert.Alert,
            {
              variant: "destructive",
              className: "mb-4 flex items-center justify-between rounded-lg bg-destructive/10 border-destructive/30",
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_alert.AlertTitle, { className: "text-destructive font-semibold", children: "Account Not Active" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_alert.AlertDescription, { className: "text-destructive/80", children: "Your account is pending activation by the admin. Some features are limited until then." })
              ] })
            }
          ),
          children
        ]
      }
    );
  };
  Main.displayName = "Main";
})();
