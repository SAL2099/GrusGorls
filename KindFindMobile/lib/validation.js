//validates password

// Function to check password requirements 
export const getPasswordRequirements = (password) => {
  return [
    { label: "At least 8 characters", fulfilled: password.length >= 8 },
    { label: "An uppercase letter", fulfilled: /[A-Z]/.test(password) },
    { label: "A number", fulfilled: /[0-9]/.test(password) },
    { label: "A special character (@, #, $)", fulfilled: /[!@#$%^&*]/.test(password) },
  ];
};

//Function to validate the password against the requirements and return an error message if not valid
export const validatePassword = (password) => {
  const requirements = getPasswordRequirements(password);
  const isValid = requirements.every(req => req.fulfilled);

  return {
    isValid,
    error: isValid ? "" : "Password does not meet all requirements."
  };
};
