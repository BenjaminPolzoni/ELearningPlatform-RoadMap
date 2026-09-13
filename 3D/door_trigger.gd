extends Area3D

@export var target_scene: String = "res://shop.tscn"
@export var prompt_text: String = "Entrar a la Tienda"

var _player_inside: bool = false
@onready var ui_layer: CanvasLayer = $CanvasLayer
@onready var prompt_button: Button = $CanvasLayer/CenterContainer/PanelContainer/MarginContainer/ButtonPrompt

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	prompt_button.pressed.connect(_on_button_pressed)
	prompt_button.text = "🏪 " + prompt_text + "  [E]"
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
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().change_scene_to_file(target_scene)
