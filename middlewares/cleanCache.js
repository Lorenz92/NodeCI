const { clearHash } = require("../services/cache");

module.exports = async (req, res, next) => {
  await next(); //serve per aspettare che finisca il request handler (es. creazione di un post) altrimenti dumperebbe la cache prima di eseguire la query

  clearHash(req.user.id);
};
