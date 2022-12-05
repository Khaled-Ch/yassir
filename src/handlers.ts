import { FastifyRequest, FastifyReply } from "fastify";
import { PokemonWithStats } from "models/PokemonWithStats";

export async function getPokemonByName(
  request: FastifyRequest,
  reply: FastifyReply
) {
  var name: string = request.params["name"];

  const response: any = await fetchPokemon(name);

  if (response == null) {
    reply.code(404);
  }

  if (
    JSON.parse(response).results &&
    JSON.parse(response).results.length !== 0
  ) {
    reply.send(JSON.parse(response).results);
    return reply;
  }

  const pokemonStat = await computeResponse(
    JSON.parse(response.toString()),
    reply
  );

  reply.send(pokemonStat);

  return reply;
}

export const computeResponse = async (response: any, reply: FastifyReply) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!response.types) {
        resolve({});
      }

      const resp = response as any;

      let types = resp.types
        .map((type) => type.type)
        .map((type) => {
          return type.url;
        });

      let promisees = [];

      types.forEach((element) => {
        promisees.push(fetchPokemonType(element));
      });

      const pokemonTypes = await Promise.all(promisees);

      if (pokemonTypes === undefined) throw pokemonTypes;

      let averageBaseExperience = 0;
      response.stats.forEach((element) => {
        var stats = [];

        pokemonTypes.map((pok) =>
          pok.name.toUpperCase() == element.stat.name
            ? stats.push(element.base_state)
            : []
        );

        if (stats.length !== 0) {
          let avg = stats.reduce((a, b) => a + b) / stats.length;
          averageBaseExperience = avg;
        } else {
          averageBaseExperience = 0;
        }
      });
      const pokemonStat: PokemonWithStats = {
        name: response.name,
        height: response.height,
        base_experience: response.base_experience,
        averageBaseExperience: averageBaseExperience,
        id: response.id,
        sprite_img: response.sprites.front_default,
        species: response.species,
        url: response.species.url,
        stats: response.stats,
      };
      resolve(pokemonStat);
    } catch (error) {
      reject(error);
    }
  });
};

function fetchPokemon(name): Promise<string> {
  return new Promise((resolve, reject) => {
    let filter = "";

    name !== undefined
      ? name.trim() !== ""
        ? ((filter = filter + "/"), (filter = filter + name))
        : ((filter = filter + '?offset=20"'), (filter = filter + "&limit=20"))
      : ((filter = filter + "?offset=20"), (filter = filter + "&limit=20"));

    var https = require("follow-redirects").https;

    var options = {
      method: "GET",
      hostname: "pokeapi.co",
      path: `/api/v2/pokemon/${filter}`,
      headers: {},
      maxRedirects: 20,
    };

    var req = https.request(options, function (res) {
      var chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function (chunk) {
        var body = Buffer.concat(chunks);
        resolve(body.toString());
      });

      res.on("error", function (error) {
        reject(error);
      });
    });

    req.end();
  });
}

function fetchPokemonType(type): Promise<any> {
  return new Promise((resolve, reject) => {
    var https = require("follow-redirects").https;

    var req = https.get(type, (res) => {
      var chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });

      res.on("end", function (chunk) {
        var body = Buffer.concat(chunks);
        resolve(JSON.parse(body.toString()));
      });

      res.on("error", function (error) {
        reject(error);
      });
    });

    req.end();
  });
}
