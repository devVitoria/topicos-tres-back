import { Router, Request, Response } from "express";
import { pixDs } from "../data-source";
import { JwtVerifyAuth } from "../functions/jwt";
import { Usuario } from "../entities/usuario.entity";
import { Conta } from "../entities/conta.entity";
import { Chave } from "../entities/chave.entity";

const usuarioRoutes = Router();
const usuarioRepo = pixDs.getRepository(Usuario);
const chaveRepo = pixDs.getRepository(Chave)
usuarioRoutes.post("/", async (req: Request, resp: Response) => {
  const userData = req.body;
  let usuario = new Usuario();
  if (userData.conta) {
    const conta = new Conta();
    conta.nroConta = userData.conta.nroConta;
    conta.saldo = userData.conta.saldo;

    usuario.conta = conta;
  }
  usuario.cpfcnpj = userData.cpfcnpj;
  usuario.nome = userData.nome;
  usuario.bairro = userData.bairro;
  usuario.rua = userData.rua;
  usuario.telefone = userData.telefone;
  usuario.cidade = userData.cidade;
  usuario.email = userData.email;
  usuario.password = userData.password;

  try {
    await usuarioRepo.save(usuario);
    resp.statusCode = 201;
    resp.statusMessage = "Created";
    resp.json({ "status:": usuario.id });
  } catch (e: any) {
    console.error("Erro ao salvar usuário:", e);
    resp.status(500).json({ message: e.message });
  }
});

usuarioRoutes.post("/verify-data", async (req: Request, resp: Response) => {
  const userData = req.body;
  let itemsFound: string[] = [];

  const existingUserCPF = await usuarioRepo
    .findOne({ where: { cpfcnpj: userData.cpfcnpj } })
    .then((user) => {
      user?.id !== undefined ? itemsFound.push("CPF") : null;
    });

  const existingUserEmail = await usuarioRepo
    .findOne({ where: { email: userData.email } })
    .then((user) => {
      user?.id !== undefined ? itemsFound.push("e-mail") : null;
    });

  const existingPhone = await usuarioRepo
    .findOne({ where: { telefone: userData.telefone } })
    .then((user) => {
      user?.id !== undefined ? itemsFound.push("telefone") : null;
    });
  const existingUserConta = await usuarioRepo
    .findOne({ where: { conta: { nroConta: userData.conta.nroConta } } })
    .then((user) => {
      user?.id !== undefined ? itemsFound.push("número de conta") : null;
    });


  if (
  (  existingUserCPF === null ||
    existingUserCPF === undefined) &&
  (  existingUserEmail === null ||
    existingUserEmail === undefined) &&
(    existingUserConta === null ||
    existingUserConta === undefined ) &&
(    existingPhone === null ||
    existingPhone === undefined)
  ) {
    resp
      .status(200)
      .json({ exists: false, message: `Dados disponíveis para cadastro.` });
  }

  return resp.status(200).json({ exists: true, message: itemsFound });
});

usuarioRoutes.get("/", async (req: Request, resp: Response) => {
  const authHeader = req.headers.authorization;
  const teste = await JwtVerifyAuth(authHeader ?? "");
  if (!teste || authHeader === undefined) {
    resp.statusCode = 404;
    resp.statusMessage = "Acesso não permitido. Token inválido.";
    resp.send();
  }

  const usuarios = await usuarioRepo.find();
  resp.statusCode = 200;
  resp.statusMessage = "Request sucessfull";
  resp.json(usuarios);
});




usuarioRoutes.get("/:usuarioId", async (req: Request, resp: Response) => {
  const authHeader = req.headers.authorization;
  const teste = await JwtVerifyAuth(authHeader ?? "");
  if (!teste) {
    resp.statusCode = 404;
    resp.statusMessage = "Acesso não permitido. Token inválido.";
    resp.send();
  }
  const usuario = await usuarioRepo.findOne({
    where: { id: parseInt(req.params.usuarioId) },
  });

  resp.statusCode = 200;
  resp.statusMessage = "Request sucessfull";
  resp.json(usuario);
});

usuarioRoutes.patch("/:usuarioId", async (req: Request, resp: Response) => {
  const authHeader = req.headers.authorization;
  const teste = await JwtVerifyAuth(authHeader ?? "");
  if (!teste) {
    resp.statusCode = 400;
    resp.statusMessage = "Acesso não permitido. Token inválido.";
    resp.send();
  }
  const dataUser = req.body;

  const userUpdate = await usuarioRepo.update(req.params.usuarioId, {
    ...dataUser,
  });

  if ((userUpdate?.affected ?? 0) > 0) {
    resp.statusCode = 200;
    resp.statusMessage = "Atualizado";
    resp.json({ status: "OK" });
  } else {
    resp.statusCode = 404;
    resp.statusMessage = "Usuário não encontrado";
    resp.send();
  }
});

usuarioRoutes.delete("/:usuarioId", async (req: Request, resp: Response) => {
  const authHeader = req.headers.authorization;

  const teste = JwtVerifyAuth(authHeader ?? "");
  if (!teste || authHeader === undefined) {
    resp.statusCode = 404;
    resp.statusMessage = "Acesso não permitido. Token inválido.";
    resp.send();
  }

  const result = await usuarioRepo.delete({
    id: parseInt(req.params.usuarioId),
  });
  if ((result?.affected ?? 0) > 0) {
    resp.statusCode = 204;
    resp.statusMessage = "Usuário removido";
    resp.send();
  } else {
    resp.statusCode = 404;
    resp.statusMessage = "Usuário não encontrado";
    resp.send();
  }
});




usuarioRoutes.get(
  "/:usuarioId/chaves",
  async (req: Request, resp: Response) => {
    const authHeader = req.headers.authorization;

    const teste = JwtVerifyAuth(authHeader ?? "");
    if (!teste || authHeader === undefined) {
      resp.statusCode = 404;
      resp.statusMessage = "Acesso não permitido. Token inválido.";
      resp.send();
    }

    const chaves = await usuarioRepo.findOne({
      where: { id: parseInt(req.params.usuarioId) },
      relations: ["chaves"],
    });

    resp.statusCode = 200;
    resp.statusMessage = "Request sucessfull";
    resp.json(chaves?.chaves);
  }
);

usuarioRoutes.get(
  "/:usuarioId/transacoes",
  async (req: Request, resp: Response) => {
    const authHeader = req.headers.authorization;
    const teste = JwtVerifyAuth(authHeader ?? "");
    if (!teste || authHeader === undefined) {
      resp.statusCode = 404;
      resp.statusMessage = "Acesso não permitido. Token inválido.";
      resp.send();
    }

    const transacoes = await usuarioRepo.findOne({
      where: { id: parseInt(req.params.usuarioId) },
      relations: [
        "chaves",
        "chaves.transacaoOrigem",
        "chaves.transacaoDestino",
      ],
    });

    const transacoesEstrita = await transacoes?.chaves.flatMap((chave) =>
      chave.transacaoOrigem.map((trans) => ({
        ...trans,
        chaveEnvio: chave.chave,
      }))
    );
    let transacoesEChaveRelacionada: any[] = await Promise.all(
      (transacoesEstrita ?? []).map(async (vlr) => {
        const chaveEnviada = await usuarioRepo.find({
          where: { id: parseInt(req.params.usuarioId) },
          relations: ["chaves"],
        });
        return {
          ...vlr,
        };
      })
    );
    resp.statusCode = 200;
    resp.statusMessage = "Request sucessfull";
    resp.json(transacoesEChaveRelacionada);
  }
);

// usuarioRoutes.get("/usuario/:usuarioId",
//     async (req: Request, resp: Response) => {
//         const usuario = await usuarioRepo.findOneBy({
//             id: req.params.usuarioId
//         })
//         resp.statusCode = 200;
//         resp.statusMessage = "Request sucessfull"
//         resp.json(usuario)
//     }
// )

// usuarioRoutes.put("/usuario/edit",
//     async (req: Request, resp: Response) => {
//         const dataUser = req.body;

//         let usuarioEdit = new Usuario()
//         usuarioEdit.cpfcnpj = dataUser.cpfcnpj
//         usuarioEdit.nome = dataUser.nome
//         usuarioEdit.bairro = dataUser.bairro
//         usuarioEdit.rua = dataUser.rua
//         usuarioEdit.telefone = dataUser.telefone
//         usuarioEdit.cidade = dataUser.cidade
//         usuarioEdit.nroConta = dataUser.nro_conta
//         usuarioEdit.email = dataUser.email
//         usuarioEdit.password = dataUser.password

//         const userUpdate = await usuarioRepo.update(dataUser.id, usuarioEdit)

//         if ((userUpdate?.affected ?? 0) > 0) {
//             resp.statusCode = 201;
//             resp.statusMessage = "Atualizado"
//             resp.json({ "status": "OK" })
//         } else {
//             resp.statusCode = 404;
//             resp.statusMessage = "Usuário não encontrado"
//             resp.send()
//         }

//     }

// )

export default usuarioRoutes;
