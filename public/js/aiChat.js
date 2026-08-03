document.addEventListener('DOMContentLoaded', () => {

  // -------------------- Elements --------------------
  const aiChatBody = document.getElementById('aiChatBody');
  const aiUserInput = document.getElementById('aiUserInput');
  const aiSendBtn = document.getElementById('aiSendBtn');

  const aiBtns = document.querySelectorAll('.ai-btn');      // Quick buttons: Low Stock / All Products
  const forecastInput = document.getElementById('forecastInput'); // Input for product forecast
  const forecastBtn = document.getElementById('forecastBtn');     // Forecast button

  // -------------------- Safety check --------------------
  if (!aiChatBody || !aiUserInput || !aiSendBtn) {
    console.warn('AI Chat elements not found.');
    return;
  }

  // -------------------- Helper: add chat message --------------------
  function addMessage(role, text) {
    const div = document.createElement('div');
    div.classList.add('ai-chat-message', role);

    if (role === 'ai') {
      div.innerHTML = marked.parse(text); // Markdown -> HTML
    } else {
      div.textContent = text;
    }

    aiChatBody.appendChild(div);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
  }

  // -------------------- Fetch Utility --------------------
  async function fetchJSON(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`Error fetching ${url}:`, err);
      return [];
    }
  }

  // -------------------- Send AI message --------------------
  async function sendAIMessage(messageParam) {
    const message = messageParam || aiUserInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    aiUserInput.value = '';
    aiUserInput.disabled = true;
    aiSendBtn.disabled = true;

    // Loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.color = 'gray';
    loadingDiv.style.margin = '6px 0';
    loadingDiv.textContent = 'AI is typing...';
    aiChatBody.appendChild(loadingDiv);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;

    try {
      // -------------------- Low Stock --------------------
      if (message.toLowerCase().includes('low stock')) {
        const products = await fetchJSON('/api/products');
        const lowStock = products.filter(p => p.quantity < 10);
        let reply = 'No low stock items';
        if (lowStock.length) {
          reply = lowStock.map(p => `- **${p.name}**: ${p.quantity} left`).join('\n');
        }
        loadingDiv.remove(); // remove typing indicator before returning
        addMessage('ai', reply);
        return;
      }

      // -------------------- All Products --------------------
      if (message.toLowerCase().includes('all products')) {
        const products = await fetchJSON('/api/products');
        let reply = 'No products found';
        if (products.length) {
          reply = products.map(p => `- **${p.name}**: ${p.quantity} units`).join('\n');
        }
        loadingDiv.remove(); // remove typing indicator before returning
        addMessage('ai', reply);
        return;
      }

      // -------------------- Forecast --------------------
      if (message.toLowerCase().startsWith('forecast')) {
        const productName = message.slice(8).trim();
        if (!productName) {
          loadingDiv.remove();
          addMessage('ai', '⚠️ Please provide a product name to forecast.');
          return;
        }
        const forecasts = await fetchJSON('/api/predict-sales');
        const forecast = forecasts.find(f => f.product.toLowerCase() === productName.toLowerCase());
        if (!forecast) {
          loadingDiv.remove();
          addMessage('ai', `No forecast available for **${productName}**.`);
          return;
        }
        const predicted = forecast.predicted_stock_by_day
          .map(d => `${d.date}: ${d.predicted_stock}`)
          .join('\n');
        loadingDiv.remove();
        addMessage('ai', `Forecast for **${productName}**:\n${predicted}`);
        return;
      }

      // -------------------- Generic AI Backend --------------------
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      loadingDiv.remove();

      if (!res.ok) {
        addMessage('ai', '⚠️ Error connecting to server.');
        return;
      }

      const data = await res.json();
      addMessage('ai', data.reply || 'No reply from AI.');

    } catch (err) {
      loadingDiv.remove();
      addMessage('ai', '⚠️ Server connection failed.');
      console.error(err);
    } finally {
      aiUserInput.disabled = false;
      aiSendBtn.disabled = false;
      aiUserInput.focus();
    }
  }

  // -------------------- Event Listeners --------------------

  // Send button
  aiSendBtn.addEventListener('click', () => sendAIMessage());

  // Enter key in input
  aiUserInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAIMessage();
  });

  // Quick action buttons: Low Stock / All Products
  aiBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sendAIMessage(btn.dataset.command);
    });
  });



});
