/**
 * TYPE User object has:
 * username = string
 * password = string
 * displayname = string (optional)
 * firstname = string
 * lastname = string
 * fullname = string (optional)
 * dob = string
 * email = string
 * phone = string (optional)
 * rooms = string (optional)
 * timestamp = string
 * 
 * optional fields permit null or undefined.
 * fields not labeled optional cannot be null or undefined.
 */

/**
 * Helper function that subtracts years from given dates.
 * @param {Date} date 
 * @param {int} years 
 * @returns 
 */
const subtractYear = (date, years) => {
  const newDate = new Date(date);
  newDate.setFullYear(date.getFullYear() - years);
  return newDate;
}

/**
 * Checks if the user and its fields are all valid.
 * @param {User} user User object. See user.js for more info
 * @returns true if user is valid, false if not
 */
const checkUser = (user) => {

  let isInvalid = true;
  if (user.username && user.username.match(/^\w{3,25}$/) &&
    user.password && user.password.match(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,40}$/) &&
    user.email && user.email.match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/) &&
    user.firstname && user.firstname.match(/^[A-Za-z-\s']{1,25}$/) &&
    user.lastname && user.lastname.match(/^[A-Za-z-\s']{1,25}$/) &&
    user.affiliation && user.affiliation.match(/^[a-zA-Z0-9_ ]{1,40}$/) &&
    user.timestamp && !isNaN(Date.parse(user.timestamp)) &&
    // conditionals for optional fields

    (!user.displayname || user.username.match(/^\w{1,25}$/)) &&
    (!user.phone || (user.phone.match(/^[A-Z][a-z0-9_-]{1,25}$/))) ) {
      
      // check for Date of Birth correctness. Must be older than 13 years.
      if (user.dob) {
        let dobDate = new Date(user.dob);
        if (!isNaN(dobDate) && dobDate > new Date("1900-01-01") 
          && dobDate < subtractYear(new Date(), 13)) {
            isInvalid = false;
        }
      }
  } 
  return !isInvalid; 
}

const user = {
  checkUser: checkUser,
}

module.exports = user;