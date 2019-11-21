class UserProfile {
  constructor(transport, name, age) {
    this.transport = transport;
    this.name = name;
    this.age = age;
  }
}

module.exports.UserProfile = UserProfile;