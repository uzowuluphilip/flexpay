self.addEventListener('push', (event) => {
  let data = {}

  try {
    data = event.data ? event.data.json() : {}
  } catch (error) {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'FlexPay update'
  const options = {
    body: data.body || 'You have a new FlexPay update.',
    icon: data.icon || '/icons.svg',
    badge: data.badge || '/icons.svg',
    data: { url: data.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const matchingClient = clientList.find((client) => new URL(client.url).origin === self.location.origin)
      if (matchingClient) {
        return matchingClient.focus().then(() => matchingClient.navigate(targetUrl))
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
