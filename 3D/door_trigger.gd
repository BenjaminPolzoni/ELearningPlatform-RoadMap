extends Area3D

@export var target_scene: String = "res://shop.tscn"
@export var prompt_text: String = "Entrar a la Tienda"

## Id de la Unidad/bioma en Angular (roadmap.models.ts: Unidad.id, ej. "u1").
## Si está vacío, la puerta se comporta como una puerta local normal (target_scene).
## Si tiene valor, al entrar se avisa al host web (Angular) para que abra el
## mapa de desafíos de esa unidad, en vez de cambiar de escena en Godot.
@export var unit_id: String = ""

var _player_inside: bool = false
@onready var ui_layer: CanvasLayer = $CanvasLayer
@onready var prompt_button: Button = $CanvasLayer/CenterContainer/PanelContainer/MarginContainer/ButtonPrompt

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	prompt_button.pressed.connect(_on_button_pressed)
	var emoji := "🗺️ " if unit_id != "" else "🏪 "
	prompt_button.text = emoji + prompt_text + "  [E]"
	ui_layer.visible = false

func _on_body_entered(body: Node3D) -> void:
	if body is CharacterBody3D:
		_player_inside = true
		ui_layer.visible = true

func _on_body_exited(body: Node3D) -> void:
	if body is CharacterBody3D:
		_player_inside = false
		ui_layer.visible = false

func _unhandled_input(event: InputEvent) -> void:
	if _player_inside and event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_E or event.keycode == KEY_ENTER:
			_change_scene()

func _on_button_pressed() -> void:
	if _player_inside:
		_change_scene()

func _change_scene() -> void:
	if unit_id != "":
		_notify_enter_unit()
		return
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().change_scene_to_file(target_scene)

## Notifica al host web (Angular) que el jugador entró al bioma `unit_id`,
## para que navegue a /alumno/unidad/:id (mapa de desafíos de esa unidad).
## Fuera del navegador (editor/desktop) no hay a quién avisarle: solo se loguea.
func _notify_enter_unit() -> void:
	if OS.has_feature("web"):
		var mensaje := "window.parent.postMessage({type:'enterUnit', unitId:'%s'}, '*')" % unit_id
		JavaScriptBridge.eval(mensaje, true)
	else:
		print("[DoorTrigger] Entrando a la unidad '%s' (mapa de desafíos vive en Angular, no en Godot desktop)" % unit_id)
