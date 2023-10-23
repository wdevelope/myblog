const userRepository = require('../repositories/user');
const bcrypt = require('bcrypt');

module.exports = {
  // 회원가입
  register: async (name, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userRepository.register(name, email, hashedPassword);

    return newUser;
  },

  // 로그인
  login: async (req, res) => {
    const { email, password } = req.body;
    const user = await userRepository.login(email);

    if (!user) {
      return res.status(404).json({ message: '유저가 존재하지 않습니다.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 틀렸습니다.' });
    }

    return res.status(200).json({ message: '로그인 성공' });
  },
};
