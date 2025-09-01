// Payment Confirmation Page Functionality
document.addEventListener('DOMContentLoaded', () => {
  initializePaymentConfirmation();
});

function initializePaymentConfirmation() {
  // Only run on payment confirmation page
  if (!window.location.pathname.includes('payment-confirmation')) return;

  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('request_id');

  if (!requestId) {
    showPaymentError('Invalid payment link. Missing request ID.');
    return;
  }

  // Check if user is logged in
  const authToken = localStorage.getItem('access_token');
  if (!authToken) {
    showToast('Please login to process this payment', 'error');
    setTimeout(() => {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }, 2000);
    return;
  }

  loadPaymentConfirmationDetails(requestId);
}

async function loadPaymentConfirmationDetails(requestId) {
  const authToken = localStorage.getItem('access_token');

  try {
    const response = await fetch(`http://localhost:8000/payments/confirmation_data/${requestId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to load payment details');
    }

    const paymentData = await response.json();
    displayPaymentConfirmation(paymentData);

  } catch (error) {
    console.error('Error loading payment details:', error);
    showPaymentError(error.message || 'Failed to load payment details');
  }
}

function displayPaymentConfirmation(paymentData) {
  const loadingState = document.getElementById('loadingState');
  const confirmationCard = document.getElementById('confirmationCard');

  // Hide loading state
  if (loadingState) loadingState.style.display = 'none';

  // Update payment details
  const receiverName = document.getElementById('receiverName');
  const paymentAmount = document.getElementById('paymentAmount');
  const paymentDescription = document.getElementById('paymentDescription');
  const transactionId = document.getElementById('transactionId');
  const currentBalance = document.getElementById('currentBalance');
  const balanceAfter = document.getElementById('balanceAfter');

  if (receiverName) receiverName.textContent = paymentData.receiver_name || 'Unknown';
  if (paymentAmount) paymentAmount.textContent = `$${parseFloat(paymentData.amount).toFixed(2)}`;
  if (paymentDescription) paymentDescription.textContent = paymentData.description || 'No description';
  if (transactionId) transactionId.textContent = paymentData.transaction_id || paymentData.request_id;

  // Get current user info
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  // Update balance information
  if (currentBalance && currentUser.balance !== undefined) {
    currentBalance.textContent = `$${parseFloat(currentUser.balance || 0).toFixed(2)}`;
  }
  if (balanceAfter && currentUser.balance !== undefined) {
    const afterBalance = (parseFloat(currentUser.balance || 0) - parseFloat(paymentData.amount)).toFixed(2);
    balanceAfter.textContent = `$${afterBalance}`;

    // Show warning if insufficient funds
    if (parseFloat(afterBalance) < 0) {
      balanceAfter.style.color = '#dc2626';
      showToast('Insufficient funds for this payment', 'error');
    }
  }

  // Set up action buttons
  const acceptBtn = document.getElementById('acceptBtn');
  const rejectBtn = document.getElementById('rejectBtn');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => processPaymentConfirmation(paymentData.request_id, 'accept'));
  }
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => processPaymentConfirmation(paymentData.request_id, 'reject'));
  }

  // Show confirmation card
  if (confirmationCard) confirmationCard.style.display = 'block';
}

async function processPaymentConfirmation(requestId, action) {
  const authToken = localStorage.getItem('access_token');
  const acceptBtn = document.getElementById('acceptBtn');
  const rejectBtn = document.getElementById('rejectBtn');

  // Disable buttons
  if (acceptBtn) acceptBtn.disabled = true;
  if (rejectBtn) rejectBtn.disabled = true;

  if (action === 'accept' && acceptBtn) {
    acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  } else if (rejectBtn) {
    rejectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
  }

  try {
    const response = await fetch(`http://localhost:8000/payments/process_action`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        request_id: requestId,
        action: action
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to ${action} payment`);
    }

    const result = await response.json();
    showToast(result.message || `Payment ${action}ed successfully`, 'success');

    if (action === 'accept') {
      showPaymentSuccess(result);
    } else {
      // Redirect to dashboard after rejection
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    }

  } catch (error) {
    console.error(`Error ${action}ing payment:`, error);
    showToast(error.message || `Failed to ${action} payment`, 'error');
    showPaymentError(error.message);
  } finally {
    // Re-enable buttons
    if (acceptBtn) {
      acceptBtn.disabled = false;
      acceptBtn.innerHTML = '<i class="fas fa-check"></i> Accept Payment';
    }
    if (rejectBtn) {
      rejectBtn.disabled = false;
      rejectBtn.innerHTML = '<i class="fas fa-times"></i> Reject Payment';
    }
  }
}

function showPaymentSuccess(result) {
  const confirmationCard = document.getElementById('confirmationCard');
  const successCard = document.getElementById('successCard');
  const successMessage = document.getElementById('successMessage');

  if (confirmationCard) confirmationCard.style.display = 'none';

  if (successMessage && result) {
    successMessage.textContent = `Payment of $${result.amount?.toFixed(2) || '0.00'} to ${result.receiver_name || 'Unknown'} has been processed successfully.`;
  }

  if (successCard) successCard.style.display = 'block';
}

function showPaymentError(message) {
  const loadingState = document.getElementById('loadingState');
  const confirmationCard = document.getElementById('confirmationCard');
  const errorCard = document.getElementById('errorCard');
  const errorMessage = document.getElementById('errorMessage');

  if (loadingState) loadingState.style.display = 'none';
  if (confirmationCard) confirmationCard.style.display = 'none';

  if (errorMessage) errorMessage.textContent = message;
  if (errorCard) errorCard.style.display = 'block';

  // Set up retry button
  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }
}

// Helper functions (copied from main script.js)
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}
