const lifeService = require('../services/life');

module.exports = {
  // 게시글 생성
  create: async (req, res) => {
    const { title, content, category } = req.body;
    const userId = req.user.userId;
    try {
      await lifeService.create(userId, title, content, category);
      res.status(201).json({ message: '게시글 생성 완료' });
    } catch (err) {
      console.log(err);
      res.status(500).json({ errorMessage: err.message });
    }
  },

  // life 게시글 전체조회
  getAllLife: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const { posts, totalPages } = await lifeService.getAllLife(page);
      res.status(200).json({
        posts,
        totalPages,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ errorMessage: err.message });
    }
  },

  // 게시글 삭제
  delete: async (req, res) => {
    const postId = req.params.postId;
    try {
      await lifeService.delete(postId);
      res.status(200).json({ message: '게시글 삭제 완료' });
    } catch (err) {
      console.log(err);
      res.status(500).json({ errorMessage: err.message });
    }
  },

  // 게시글 상세조회
  get: async (req, res) => {
    const postId = req.params.postId;
    try {
      const post = await lifeService.get(postId);
      res.status(200).json(post);
    } catch (err) {
      console.log(err);
      res.status(500).json({ errorMessage: err.message });
    }
  },
};