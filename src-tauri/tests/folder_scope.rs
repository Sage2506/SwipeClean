use tauri::Manager;
use tauri_plugin_fs::FsExt;

#[test]
fn selected_folder_scope_includes_hidden_entries_only_within_the_folder() {
    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_fs::init())
        .build(tauri::generate_context!())
        .expect("failed to build test app");
    let selected = std::env::current_dir()
        .unwrap()
        .join("selected-test-folder");
    let hidden_directory = selected.join(".localized");
    let hidden_media = hidden_directory.join(".photo.jpg");
    let outside = selected
        .with_file_name("outside-test-folder")
        .join(".photo.jpg");

    for scope in [app.fs_scope(), app.asset_protocol_scope()] {
        assert!(!scope.is_allowed(&hidden_media));
        scope.allow_directory(&selected, true).unwrap();
        assert!(scope.is_allowed(&hidden_directory));
        assert!(scope.is_allowed(&hidden_media));
        assert!(!scope.is_allowed(&outside));
    }
}
