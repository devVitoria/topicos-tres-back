import { Router, Request, Response } from "express"
import { pixDs } from "../data-source"
import { JwtCreate, JwtVerify } from "../functions/jwt"
import { Autenticacao } from "../entities/autenticacao.entity"
import { Usuario } from "../entities/usuario.entity"
import { AutenticacaoBlackList } from "../entities/autenticacao-black-list.entity"
import { Conta } from "../entities/conta.entity"


const usuarioRepo = pixDs.getRepository(Usuario)
const authRepo = pixDs.getRepository(Autenticacao)
const authblackListRepo = pixDs.getRepository(AutenticacaoBlackList)
const autenticacaoRoutes =  Router()
const contaRepo = pixDs.getRepository(Conta)

autenticacaoRoutes.post("/login", async (req: Request, resp: Response) => {
  const escope = req.body
  try {
    console.log("ESCOPO DESSE CARALHO", escope)
    const usuario = await usuarioRepo.findOne({
      where: { email: escope.email, password: escope.password },
    })


    if (!usuario) {
      resp.statusCode = 404;
      resp.statusMessage = "Acesso não permitido. Usuário não encontrado."
      resp.send()
    }


    const saldoUsuario = await contaRepo.findOne({
      where: {id: usuario?.id}
    })


    console.log("SAldo usuario")

    const existsUser = await authRepo.findOne({
      where: { usuario: { id: usuario?.id } },
      relations: ["usuario"],
    })

    if (usuario) {
      console.log("hell")
      if (!existsUser?.token) {
        console.log("Entrouuu")
        const token = await JwtCreate(String(usuario?.id))
        console.log("TOKENNNN", token)
        console.log("TEste")
        await authRepo.update(usuario.id, { ...existsUser, token })

        resp.statusCode = 201;
        resp.statusMessage = "Created"
        resp.json({ "status": "PASSANDO", "token": token, "nameUser": usuario.nome, "saldo": saldoUsuario?.saldo, "userId": existsUser?.usuario.id })
      }

      try {
        if(existsUser) {
        const verifia = await JwtVerify(existsUser.token)
        resp.statusCode = 200;
        resp.statusMessage = "Correto"
        resp.json({ "status:": "PASSANDO", "token": existsUser.token, "nameUser": usuario.nome, "saldo": saldoUsuario?.saldo, "userId": existsUser.usuario.id })
        }

      } catch (e: any) {
        if ((e?.code === "ERR_JWT_EXPIRED" || e?.message?.includes("JWTExpired")) && existsUser) {
          const token = await JwtCreate(String(existsUser.usuario.id))
          await authRepo.update(existsUser.id, { ...existsUser, token })

          resp.statusCode = 201;
          resp.statusMessage = "recriou o token pq tava expirado"
          resp.json({ "token:": token, "nameUser": usuario.nome, "saldo": saldoUsuario?.saldo })
        }

        resp.statusCode = 400;
        resp.statusMessage = "erro no token"
        resp.json({ "status:": "ERRP" })
      }
    }

    const token = await JwtCreate(String(usuario?.id))

    if (usuario) {
      await authRepo.save({
        token,
        usuario: usuario,
      })
      resp.statusCode = 200;
      resp.statusMessage = "Autenticado"
      resp.json({ "status:": token })
    }
  } catch (e) {
    console.log("DEU ERROOOOO", e)
    resp.statusCode = 500;
    resp.statusMessage = "erro"
    resp.json({ "status:": "deu erro" })
  }
})

autenticacaoRoutes.patch("/logout/:id", async (req: Request, resp: Response) => {
  const escope = req.body
  if (escope === undefined) {
    const existsUser = await authRepo.findOne({
      where: { usuario: { id: parseInt(req.params.id) } },
      relations: ["usuario"],
    })

    await authRepo.delete(existsUser?.id ?? 0)
    await authblackListRepo.insert({token: existsUser?.token ?? ''})
    resp.statusCode = 200;
    resp.statusMessage = "Logout"
    resp.json({ "status:": "Deslogado com sucesso" })
  }
  await authRepo.update(req.params.id, { ...escope })

  resp.statusCode = 200;
  resp.statusMessage = "att"
  resp.json({ "status:": "Sucesso" })
})

export default autenticacaoRoutes
