extends Control

const CHARACTER_MODELS: Array[String] = [
	"res://Assets/Character/Models/GLB format/character-male-a.glb",
	"res://Assets/Character/Models/GLB format/character-male-b.glb",
	"res://Assets/Character/Models/GLB format/character-male-c.glb",
	"res://Assets/Character/Models/GLB format/character-male-d.glb",
	"res://Assets/Character/Models/GLB format/character-male-e.glb",
	"res://Assets/Character/Models/GLB format/character-male-f.glb",
	"res://Assets/Character/Models/GLB format/character-female-a.glb",
	"res://Assets/Character/Models/GLB format/character-female-b.glb",
	"res://Assets/Character/Models/GLB format/character-female-c.glb",
	"res://Assets/Character/Models/GLB format/character-female-d.glb",
	"res://Assets/Character/Models/GLB format/character-female-e.glb",
	"res://Assets/Character/Models/GLB format/character-female-f.glb",
]

const CHARACTER_NAMES: Array[String] = [
	"Male A", "Male B", "Male C", "Male D", "Male E", "Male F",
	"Female A", "Female B", "Female C", "Female D", "Female E", "Female F",
]

var current_index: int = 0
var preview_instance: Node3D = null

@onready var character_name_label: Label = $VBoxContainer/CharacterName
@onready var preview_viewport: SubViewport = $VBoxContainer/SubViewportContainer/SubViewport
@onready var preview_root: Node3D = $VBoxContainer/SubViewportContainer/SubViewport/PreviewRoot

func _ready() -> void:
	_load_preview(0)

func _load_preview(index: int) -> void:
	current_index = index
	character_name_label.text = CHARACTER_NAMES[index]
	
	# Remove old preview
	if preview_instance:
		preview_instance.queue_free()
		preview_instance = null
	
	# Load new model
	var scene = load(CHARACTER_MODELS[index]) as PackedScene
	if scene:
		preview_instance = scene.instantiate()
		preview_root.add_child(preview_instance)
		# Play idle animation
		var anim_player := _find_animation_player(preview_instance)
		if anim_player and anim_player.has_animation("idle"):
			var anim := anim_player.get_animation("idle")
			anim.loop_mode = Animation.LOOP_LINEAR
			anim_player.play("idle")

func _find_animation_player(node: Node) -> AnimationPlayer:
	for child in node.get_children():
		if child is AnimationPlayer:
			return child
		var found = _find_animation_player(child)
		if found:
			return found
	return null

func _on_prev_pressed() -> void:
	var idx := (current_index - 1) % CHARACTER_MODELS.size()
	if idx < 0:
		idx = CHARACTER_MODELS.size() - 1
	_load_preview(idx)

func _on_next_pressed() -> void:
	var idx := (current_index + 1) % CHARACTER_MODELS.size()
	_load_preview(idx)

func _on_select_pressed() -> void:
	CharacterData.selected_character = CHARACTER_MODELS[current_index]
	get_tree().change_scene_to_file("res://city.tscn")
