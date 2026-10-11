const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });

const templates = [
  {
    id: "leaderstats",
    match: (s) => /leaderstats|estad[ií]sticas|monedas|coins/.test(s),
    name: "Leaderstats de monedas",
    code: `-- DANverse API: Leaderstats de monedas
-- Coloca este Script en ServerScriptService.
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = 0
    coins.Parent = leaderstats
end)`
  },
  {
    id: "healing-pad",
    match: (s) => /curaci[oó]n|curar|recuperar vida|heal|bloque de vida/.test(s),
    name: "Bloque de curación",
    code: `-- DANverse API: Bloque de curación
-- Coloca este Script dentro de una Part en Workspace.
local part = script.Parent
local HEAL_AMOUNT = 25
local cooldown = {}

part.Touched:Connect(function(hit)
    local character = hit:FindFirstAncestorOfClass("Model")
    if not character then return end

    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid or cooldown[humanoid] then return end

    cooldown[humanoid] = true
    humanoid.Health = math.min(humanoid.MaxHealth, humanoid.Health + HEAL_AMOUNT)

    task.delay(1, function()
        cooldown[humanoid] = nil
    end)
end)`
  },
  {
    id: "speed-pad",
    match: (s) => /velocidad|r[aá]pido|speed boost|correr m[aá]s/.test(s),
    name: "Bloque de velocidad temporal",
    code: `-- DANverse API: Bloque de velocidad temporal
-- Coloca este Script dentro de una Part en Workspace.
local part = script.Parent
local BOOST_SPEED = 28
local BOOST_DURATION = 5
local DEFAULT_SPEED = 16
local active = {}

part.Touched:Connect(function(hit)
    local character = hit:FindFirstAncestorOfClass("Model")
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    if not humanoid or active[humanoid] then return end

    active[humanoid] = true
    local previousSpeed = humanoid.WalkSpeed
    humanoid.WalkSpeed = BOOST_SPEED

    task.delay(BOOST_DURATION, function()
        if humanoid.Parent then
            humanoid.WalkSpeed = previousSpeed or DEFAULT_SPEED
        end
        active[humanoid] = nil
    end)
end)`
  },
  {
    id: "color-part",
    match: (s) => /cambiar.*colou?r|cambiar.*color|colores|color aleatorio|parte de color/.test(s),
    name: "Parte que cambia de color",
    code: `-- DANverse API: Parte que cambia de color
-- Coloca este Script dentro de una Part en Workspace.
local part = script.Parent

while true do
    part.Color = Color3.fromRGB(
        math.random(0, 255),
        math.random(0, 255),
        math.random(0, 255)
    )
    task.wait(2)
end`
  }
];

export default async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Método no permitido. Usa POST." }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "El cuerpo debe ser JSON válido." }, 400);
  }

  if (!body || typeof body.prompt !== "string") {
    return json({ error: 'Envía un campo "prompt" de texto.' }, 400);
  }

  const prompt = body.prompt.trim();
  if (!prompt) return json({ error: "Escribe una petición." }, 400);
  if (prompt.length > 500) {
    return json({ error: "La petición no puede superar 500 caracteres." }, 413);
  }

  const normalized = prompt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const template = templates.find((item) => item.match(normalized));

  if (!template) {
    return json({
      error: "No reconozco esa petición todavía.",
      supported: [
        "leaderstats o monedas",
        "bloque de curación",
        "bloque de velocidad",
        "parte que cambia de color"
      ],
      message: "Añade una plantilla en netlify/functions/generate.mjs para ampliar la API."
    }, 422);
  }

  return json({
    ok: true,
    provider: "DANverse Rules Engine",
    template: template.id,
    title: template.name,
    message: `Plantilla "${template.name}" generada. Revisa dónde colocarla en Roblox Studio.`,
    code: template.code
  });
};

export const config = { path: "/api/generate" };
