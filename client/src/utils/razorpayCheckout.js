let loadPromise = null;
export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Failed to load Razorpay checkout"));
    };
    document.body.appendChild(script);
  });
  return loadPromise;
}
export function openRazorpayCheckout(options) {
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      ...options,
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("dismissed")),
      },
    });
    rz.on("payment.failed", (response) =>
      reject(new Error(response.error?.description || "Payment failed")),
    );
    rz.open();
  });
}
