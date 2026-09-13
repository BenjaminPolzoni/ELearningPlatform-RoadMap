extends Node3D

func _ready() -> void:
	var anim_player := _find_animation_player(self)
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
