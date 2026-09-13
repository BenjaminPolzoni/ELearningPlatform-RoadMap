extends CharacterBody3D

## Movement speed
@export var speed := 1.2
## Sprint multiplier
@export var sprint_multiplier := 1.8
## Rotation speed (lerp)
@export var rotation_speed := 10.0
## Gravity
@export var gravity := 9.8
## Jump force
@export var jump_force := 1.5

## Camera rotation settings
@export var mouse_sensitivity := 0.005
@export var min_pitch := deg_to_rad(-80.0)
@export var max_pitch := deg_to_rad(-15.0)

@onready var animation_tree: AnimationTree = $AnimationTree
@onready var model: Node3D = $Model
@onready var camera_pivot: Node3D = $CameraPivot
@onready var camera_3d: Camera3D = $CameraPivot/Camera3D

var _current_anim: String = ""
var _is_rotating_cam: bool = false

func _ready() -> void:
	# Initial camera angle (isometric perspective: 45 yaw, -35 pitch)
	camera_pivot.rotation_degrees = Vector3(-35.0, 45.0, 0.0)
	
	# If a character was selected, swap the model
	if CharacterData.selected_character != "":
		var scene = load(CharacterData.selected_character) as PackedScene
		if scene:
			var old_model = $Model
			var new_model = scene.instantiate()
			new_model.name = "Model"
			new_model.scale = old_model.scale
			new_model.rotation = old_model.rotation
			new_model.position = old_model.position
			old_model.queue_free()
			add_child(new_model)
			model = new_model
	
	_play_animation("idle")

func _find_animation_player(node: Node) -> AnimationPlayer:
	for child in node.get_children():
		if child is AnimationPlayer:
			return child
		var found = _find_animation_player(child)
		if found:
			return found
	return null

func _unhandled_input(event: InputEvent) -> void:
	# Right mouse button to rotate camera
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			_is_rotating_cam = event.pressed
			if _is_rotating_cam:
				Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			else:
				Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			camera_3d.position.z = clamp(camera_3d.position.z - 0.2, 0.8, 4.5)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			camera_3d.position.z = clamp(camera_3d.position.z + 0.2, 0.8, 4.5)
	
	# Rotate camera pivot when right-clicking and moving mouse
	elif event is InputEventMouseMotion and _is_rotating_cam:
		camera_pivot.rotation.y -= event.relative.x * mouse_sensitivity
		camera_pivot.rotation.x -= event.relative.y * mouse_sensitivity
		camera_pivot.rotation.x = clamp(camera_pivot.rotation.x, min_pitch, max_pitch)
		camera_pivot.rotation.z = 0.0

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		_is_rotating_cam = false
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _physics_process(delta: float) -> void:
	# Gravity
	if not is_on_floor():
		velocity.y -= gravity * delta
	
	# Input
	var input_dir := Vector2.ZERO
	input_dir.x = Input.get_axis("move_left", "move_right")
	input_dir.y = Input.get_axis("move_up", "move_down")
	input_dir = input_dir.normalized()
	
	var is_sprinting := Input.is_action_pressed("sprint")
	
	# Movement relative to the camera's current facing direction
	var cam_basis: Basis = camera_3d.global_transform.basis
	var forward := -cam_basis.z
	forward.y = 0.0
	forward = forward.normalized()
	var right := cam_basis.x
	right.y = 0.0
	right = right.normalized()
	
	var direction := (forward * -input_dir.y + right * input_dir.x)
	direction.y = 0.0
	if direction.length() > 0.01:
		direction = direction.normalized()
	
	# Movement
	var current_speed := speed
	if is_sprinting and direction.length() > 0.01:
		current_speed *= sprint_multiplier
	
	velocity.x = direction.x * current_speed
	velocity.z = direction.z * current_speed
	
	# Jump
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_force
	
	move_and_slide()
	
	# Rotate model to face movement direction
	if direction.length() > 0.01 and model:
		var target_rot := atan2(direction.x, direction.z)
		model.rotation.y = lerp_angle(model.rotation.y, target_rot, rotation_speed * delta)
	
	# Animation
	_update_animation(direction, is_sprinting)

func _update_animation(direction: Vector3, is_sprinting: bool) -> void:
	var anim_name := "idle"
	
	if not is_on_floor():
		if velocity.y > 0:
			anim_name = "jump"
		else:
			anim_name = "fall"
	elif direction.length() > 0.01:
		if is_sprinting:
			anim_name = "sprint"
		else:
			anim_name = "walk"
	
	if anim_name != _current_anim:
		_current_anim = anim_name
		_play_animation(anim_name)

func _play_animation(anim_name: String) -> void:
	# Find AnimationPlayer in model and play
	var anim_player := _find_animation_player(model)
	if anim_player and anim_player.has_animation(anim_name):
		var anim := anim_player.get_animation(anim_name)
		# Force loop on continuous animations
		if anim_name in ["idle", "walk", "sprint", "fall"]:
			anim.loop_mode = Animation.LOOP_LINEAR
		else:
			anim.loop_mode = Animation.LOOP_NONE
		anim_player.play(anim_name)
