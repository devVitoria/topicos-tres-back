import { Router } from "express";
import { Request, Response } from "express";
import { Chave } from "../entities/chave.entity";
import { pixDs } from "../data-source";
import { Usuario } from "../entities/usuario.entity";
import { JwtVerifyAuth } from "../functions/jwt";

const chavesRoutes = Router();

const chavesRepo = pixDs.getRepository(Chave);
const usuarioRepo = pixDs.getRepository(Usuario);

chavesRoutes.post("/", async (req: Request, resp: Response) => {
  const authHeader = req.headers.authorization;
  const teste = JwtVerifyAuth(authHeader || "");
  if (!teste || authHeader === undefined) {
    resp.statusCode = 404;
    resp.statusMessage = "Acesso não permitido. Token inválido.";
    resp.send();
  }

  const data = req.body;

  let chave = new Chave();

  chave.chave = data.chave;
  chave.tipo = data.tipo;

  try {
    const veifica_chave = await chavesRepo.findOneBy({ chave: data.chave });
    if (veifica_chave) {
      throw Error("Essa chave já existe");
    }
    const usuarioId = data.usuarioId ?? data.usuario?.id;
    if (!usuarioId) {
      throw new Error("ID do usuário não informado");
    }

    const usuario = await usuarioRepo.findOneBy({ id: usuarioId });
    if (!usuario) {
      throw Error("Usuario não encontrado");
    }
    chave.usuario = usuario;

    pixDs.manager.save(chave);
    resp.statusCode = 201;
    resp.statusMessage = "Chave Criada";
    resp.send(chave);
  } catch (e: any) {
    resp.status(404).send(e.message ?? "Erro ao criar chave     ");
  }
});

chavesRoutes.delete("/:chave", async (req: Request, resp: Response) => {
  const authHeader = req.headers.authorization;
  const teste = JwtVerifyAuth(authHeader || "");
  if (!teste || authHeader === undefined) {
    resp.statusCode = 404;
    resp.statusMessage = "Acesso não permitido. Token inválido.";
    resp.send();
  }

  const query = await chavesRepo.delete(req.params.chave);
  if ((query.affected || 0) > 0) {
    resp.statusCode = 204;
    resp.statusMessage = "Chave deletada!";
    resp.send();
  } else {
    resp.statusCode = 404;
    resp.statusMessage = "Chave não encontrada!";
    resp.send();
  }
});

chavesRoutes.get("/get-chave/:chave", async (req: Request, resp: Response) => {
  // foi necessário alterar a url da api por conta de conflitos com as demais
  const authHeader = req.headers.authorization;
  const teste = JwtVerifyAuth(authHeader || "");
  if (!teste || authHeader === undefined) {
    resp.statusCode = 404;
    resp.statusMessage = "Acesso não permitido. Token inválido.";
    resp.send();
  }

  const chave = await chavesRepo.findOne({
    where: {
      chave: req.params.chave,
    },
    relations: {
      transacaoOrigem: true,
      transacaoDestino: true,
    },
  });
  resp.statusCode = 200;
  resp.statusMessage = "Requisição recebida";
  resp.json(chave);
});

chavesRoutes.get(
  "/getter/:chaveDestino/:requestUser",
  async (req: Request, resp: Response) => {
    const authHeader = req.headers.authorization;
    const teste = JwtVerifyAuth(authHeader || "");
    if (!teste || authHeader === undefined) {
      resp.statusCode = 404;
      resp.statusMessage = "Acesso não permitido. Token inválido.";
      resp.send();
    }

    const requestUser = await usuarioRepo.findOneBy({
      id: parseInt(req.params.requestUser),
    });

    const chave = await chavesRepo.findOne({
      where: {
        chave: req.params.chaveDestino,
      },
      relations: { usuario: true },
    });

    if (!chave?.usuario) {
      resp.statusCode = 404;
      resp.statusMessage = "Chave destino não encontrada";
      resp.send();
      return;
    }

    if (chave.usuario.id === requestUser?.id) {
      resp.statusCode = 400;
      resp.statusMessage = "Chave destino pertence ao usuário remetente";
      resp.send();
      return;
    }
    resp.statusCode = 200;
    resp.statusMessage = "Chave destino encontrada";
    resp.json(chave?.usuario);
  }
);

    chavesRoutes.get("/all-keys/:page", async (req: Request, resp: Response) => {

    const page = parseInt(req.params.page as string) || 1;
    const userCpf = req.query.cpfcnpj as string | undefined;
    const skip = (page - 1) * 3;


    const [results, total] = await Promise.all([
        userCpf && userCpf.trim().length === 11 ? 
        chavesRepo.query(
        `SELECT * FROM CHAVES c INNER JOIN USUARIO u ON c."usuarioId" = u."id" WHERE u."cpfcnpj" = $2 OFFSET $1
    FETCH NEXT 3 ROWS ONLY;
    `,
        [skip, userCpf || ""]
        ) :   chavesRepo.query(
        `SELECT * FROM CHAVES c INNER JOIN USUARIO u ON c."usuarioId" = u."id" OFFSET $1
    FETCH NEXT 3 ROWS ONLY;
    `,
        [skip]
        ),

        chavesRepo.query(
        `SELECT COUNT(*) as total FROM CHAVES c INNER JOIN USUARIO u ON c."usuarioId" = u."id"
    `
        ),
    ]);

    const totalPages = Math.ceil(Number(total[0].total) / 3);



    return resp.json({results, total: Number(total[0].total), totalPages});
    });

    chavesRoutes.get("/", async (req: Request, resp: Response) => {
    const authHeader = req.headers.authorization;
    const teste = JwtVerifyAuth(authHeader || "");
    if (!teste || authHeader === undefined) {
        resp.statusCode = 404;
        resp.statusMessage = "Acesso não permitido. Token inválido.";
        resp.send();
    }

    const chaves = await chavesRepo.query("SELECT * FROM chaves");
    resp.statusCode = 200;
    resp.statusMessage = "Requisição recebida";
    resp.json(chaves);
    });
    export default chavesRoutes;
