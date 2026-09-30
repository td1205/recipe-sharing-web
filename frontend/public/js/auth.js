document.addEventListener('DOMContentLoaded', function () {
  const toggleIcons = document.querySelectorAll('.toggle-password-icon');

  toggleIcons.forEach((icon) => {
    icon.addEventListener('click', function () {
      const wrapper = this.closest('.password-wrapper');
      const input = wrapper.querySelector('input');

      if (input.type === 'password') {
        input.type = 'text';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
      }
    });
  });

  const otpInputs = document.querySelectorAll('.otp-input');

  if (otpInputs.length > 0) {
    otpInputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          otpInputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').replace(/\D/g, '');
        otpInputs.forEach((otpInput, i) => {
          otpInput.value = pasteData[i] || '';
        });
        const lastFilled = Math.min(pasteData.length - 1, otpInputs.length - 1);
        if (lastFilled >= 0) otpInputs[lastFilled].focus();
      });
    });
  }
});

function gopOTP() {
  const inputs = document.querySelectorAll('.otp-input');
  let otpFull = '';
  inputs.forEach((input) => {
    otpFull += input.value;
  });
  document.getElementById('otp').value = otpFull;
  console.log('otpFull=' + otpFull);
  return true;
}
