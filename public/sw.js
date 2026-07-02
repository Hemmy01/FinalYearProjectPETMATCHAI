self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? "PetMatchAI"
  const options = {
    body: data.body ?? "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url ?? "/" },
    vibrate: [200, 100, 200],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
